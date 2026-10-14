/* ================= GIT ENGINE: a tiny pretend-git that lives in memory ================= */
const DAY0=Date.UTC(2026,9,14,9,0,0);
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const p2=n=>String(n).padStart(2,'0');
const fmtDate=seq=>{const d=new Date(DAY0+seq*47*60000);return `${WD[d.getUTCDay()]} ${MO[d.getUTCMonth()]} ${d.getUTCDate()} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00 2026 +0000`;};
const isoDate=seq=>{const d=new Date(DAY0+seq*47*60000);return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())}`;};
function sha(s){let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}
 h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
 return ((h2>>>0).toString(16).padStart(8,'0')+(h1>>>0).toString(16).padStart(8,'0')).slice(0,7);}
const full=id=>(id+sha(id+'a')+sha(id+'b')+sha(id+'c')+sha(id+'d')+sha(id+'e')).slice(0,40);
const escRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const uniq=a=>[...new Set(a)];
const lines=s=>(s===undefined||s==='')?[]:s.split('\n');
const plural=(n,w)=>n+' '+w+(n===1?'':'s');
const emailOf=n=>n.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'')+'@garden.dev';

function newRepo(){return{inited:false,seq:0,commits:{},branches:{},head:{branch:'main'},index:{},work:{},stash:[],tags:{},tagMsg:{},remote:null,tracking:{},upstream:{},reflog:[],config:{},op:null,bisect:null,prevBranch:null,tm:0,flags:{},orig:null};}
function resetRepo(r){for(const k of Object.keys(r))delete r[k];Object.assign(r,newRepo());}
const isDet=r=>r.head.branch===undefined;
const headId=r=>isDet(r)?r.head.id:r.branches[r.head.branch];
const treeOf=(r,id)=>(id&&r.commits[id])?r.commits[id].tree:{};
const headTree=r=>treeOf(r,headId(r));
const curName=r=>isDet(r)?null:r.head.branch;
function ancestors(r,id){const s=new Set();const st=id?[id]:[];while(st.length){const x=st.pop();if(s.has(x))continue;s.add(x);st.push(...r.commits[x].parents);}return s;}
const isAnc=(r,a,b)=>ancestors(r,b).has(a);
function mergeBase(r,a,b){const A=ancestors(r,a);let best=null;for(const x of ancestors(r,b)){if(A.has(x)&&(!best||r.commits[x].seq>r.commits[best].seq))best=x;}return best;}
const nCommits=r=>ancestors(r,headId(r)).size;
function mkCommit(r,msg,tree,parents,author){r.seq++;const id=sha(msg+JSON.stringify(tree)+parents.join()+r.seq);r.commits[id]={id,msg,tree:{...tree},parents,author:author||r.config['user.name']||'You',seq:r.seq};return id;}
function moveHead(r,id,why){if(isDet(r))r.head={id};else r.branches[r.head.branch]=id;r.reflog.unshift({id,why});}

function resolveRev(r,spec){
 if(!spec)return null;const i=spec.search(/[~^]/);const base=i<0?spec:spec.slice(0,i);const rest=i<0?'':spec.slice(i);let id=null;
 if(base==='HEAD'||base==='@')id=headId(r);else if(r.branches[base])id=r.branches[base];else if(r.tags[base])id=r.tags[base];else if(r.tracking[base])id=r.tracking[base];
 else if(base==='ORIG_HEAD')id=r.orig;
 else if(/^[0-9a-f]{4,40}$/.test(base)){const m=Object.keys(r.commits).filter(k=>k.startsWith(base.slice(0,7)));if(m.length===1)id=m[0];}
 if(!id||!r.commits[id])return null;
 const re=/([~^])(\d*)/g;let m;
 while((m=re.exec(rest))){const n=m[2]===''?1:parseInt(m[2],10);
  if(m[1]==='~'){for(let k=0;k<n;k++){id=r.commits[id].parents[0];if(!id)return null;}}
  else{if(n===0)continue;id=r.commits[id].parents[n-1];if(!id)return null;}}
 return id;}

/* ---------- parsing ---------- */
function tokenize(s){const t=[];t.q=[];let cur='',inq=null,has_=false,wq=false;
 for(const ch of s){
  if(inq){if(ch===inq)inq=null;else cur+=ch;}
  else if(ch==='"'||ch==="'"){inq=ch;has_=true;wq=true;}
  else if(/\s/.test(ch)){if(has_||cur!==''){t.push(cur);t.q.push(wq);cur='';has_=false;wq=false;}}
  else{cur+=ch;has_=true;}}
 if(has_||cur!==''){t.push(cur);t.q.push(wq);}return t;}
function parseArgs(tokens,valued=[]){const pos=[],f={};
 for(let i=0;i<tokens.length;i++){const t=tokens[i];
  if(t==='--'){f['--']=true;pos.push(...tokens.slice(i+1));break;}
  if(t.startsWith('--')){const eq=t.indexOf('=');if(eq>0)f[t.slice(0,eq)]=t.slice(eq+1);else if(valued.includes(t))f[t]=tokens[++i];else f[t]=true;}
  else if(t.startsWith('-')&&t.length>1&&!/^-\d+$/.test(t)){const L=t.slice(1).split('');L.forEach((ch,idx)=>{const k='-'+ch;if(valued.includes(k)&&idx===L.length-1)f[k]=tokens[++i];else f[k]=true;});}
  else pos.push(t);}
 return{pos,f};}
const val=(f,...ks)=>{for(const k of ks)if(f[k]!==undefined&&f[k]!==true)return f[k];return undefined;};
const has=(f,...ks)=>ks.some(k=>f[k]);

function matchSpec(spec,f){if(spec==='.'||spec==='./')return true;if(spec.endsWith('/'))return f.startsWith(spec);if(spec===f||f.startsWith(spec+'/'))return true;
 if(spec.includes('*')){const re=new RegExp('^'+spec.split('*').map(escRe).join('.*')+'$');return re.test(f)||re.test(f.split('/').pop());}return false;}
function isIgnored(r,f){const gi=r.work['.gitignore'];if(!gi)return false;
 return gi.split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')).some(p=>{
  const dirOnly=p.endsWith('/');if(dirOnly)p=p.slice(0,-1);if(p.startsWith('/'))p=p.slice(1);
  const re=new RegExp('^'+p.split('*').map(escRe).join('[^/]*')+'$');const parts=f.split('/');
  for(let i=0;i<parts.length;i++){const last=i===parts.length-1;if(dirOnly&&last)continue;if(re.test(parts[i])||re.test(parts.slice(0,i+1).join('/')))return true;}
  return false;});}

/* ---------- diffs & merges ---------- */
function diffLines(a,b){const n=a.length,m=b.length;const dp=Array.from({length:n+1},()=>new Array(m+1).fill(0));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 const out=[];let i=0,j=0;
 while(i<n&&j<m){if(a[i]===b[j]){out.push([' ',a[i]]);i++;j++;}else if(dp[i+1][j]>=dp[i][j+1]){out.push(['-',a[i]]);i++;}else{out.push(['+',b[j]]);j++;}}
 while(i<n)out.push(['-',a[i++]]);while(j<m)out.push(['+',b[j++]]);return out;}
function hunks(d){const keep=new Array(d.length).fill(false);
 d.forEach((x,i)=>{if(x[0]!==' ')for(let j=Math.max(0,i-3);j<=Math.min(d.length-1,i+3);j++)keep[j]=true;});
 let o=1,n=1;const ON=d.map(x=>{const q=[o,n];if(x[0]!=='+')o++;if(x[0]!=='-')n++;return q;});
 const out=[];let i=0;
 while(i<d.length){if(!keep[i]){i++;continue;}let j=i;while(j<d.length&&keep[j])j++;const seg=d.slice(i,j);
  const oc=seg.filter(x=>x[0]!=='+').length,nc=seg.filter(x=>x[0]!=='-').length;
  out.push({h:`@@ -${oc?ON[i][0]:ON[i][0]-1},${oc} +${nc?ON[i][1]:ON[i][1]-1},${nc} @@`,lines:seg});i=j;}
 return out;}
function statOf(a,b){const files=[];let A=0,D=0;
 for(const f of uniq([...Object.keys(a),...Object.keys(b)]).sort()){const o=a[f],n=b[f];if(o===n)continue;
  const d=diffLines(lines(o),lines(n));const ad=d.filter(x=>x[0]==='+').length,de=d.filter(x=>x[0]==='-').length;
  files.push({f,k:o===undefined?'A':n===undefined?'D':'M',add:ad,del:de});A+=ad;D+=de;}
 return{files,add:A,del:D};}
function printStat(X,st,modes){if(!st.files.length)return;const w=Math.max(...st.files.map(x=>x.f.length));
 st.files.forEach(x=>X.S(' '+x.f.padEnd(w)+' | '+String(x.add+x.del).padStart(2)+' ',['+'.repeat(Math.min(x.add,18)),'g'],['-'.repeat(Math.min(x.del,18)),'r']));
 X.P(` ${plural(st.files.length,'file')} changed`+(st.add?`, ${plural(st.add,'insertion')}(+)`:'')+(st.del?`, ${plural(st.del,'deletion')}(-)`:''));
 if(modes)st.files.forEach(x=>{if(x.k==='A')X.P(` create mode 100644 ${x.f}`);if(x.k==='D')X.P(` delete mode 100644 ${x.f}`);});}
const subTree=(t,fs)=>{const o={};fs.forEach(f=>{if(t[f]!==undefined)o[f]=t[f];});return o;};
function showDiff(X,a,b,o={}){
 const files=uniq([...Object.keys(a),...Object.keys(b)]).sort().filter(f=>a[f]!==b[f]&&(!o.paths||!o.paths.length||o.paths.some(p=>matchSpec(p,f))));
 if(o.nameOnly){files.forEach(f=>X.P(f));return files.length;}
 if(o.stat){printStat(X,statOf(subTree(a,files),subTree(b,files)));return files.length;}
 for(const f of files){const oo=a[f],nn=b[f];
  X.S([`diff --git a/${f} b/${f}`,'bold']);
  if(oo===undefined)X.S(['new file mode 100644','bold']);if(nn===undefined)X.S(['deleted file mode 100644','bold']);
  X.S([oo===undefined?'--- /dev/null':`--- a/${f}`,'bold']);X.S([nn===undefined?'+++ /dev/null':`+++ b/${f}`,'bold']);
  hunks(diffLines(lines(oo),lines(nn))).forEach(h=>{X.S([h.h,'c']);h.lines.forEach(([op,t])=>X.S([op+t,op==='+'?'g':op==='-'?'r':'']));});}
 return files.length;}
function merge3(base,ours,theirs,ol,tl){const tree={},conflicts=[];
 for(const f of uniq([...Object.keys(base),...Object.keys(ours),...Object.keys(theirs)])){
  const b=base[f],o=ours[f],t=theirs[f];let res;
  if(o===t)res=o;else if(o===b)res=t;else if(t===b)res=o;
  else{conflicts.push(f);res=`<<<<<<< ${ol}\n${o===undefined?'':o}\n=======\n${t===undefined?'':t}\n>>>>>>> ${tl}`;}
  if(res!==undefined)tree[f]=res;}
 return{tree,conflicts};}
function setTrees(r,w,i){for(const f of Object.keys(r.index))if(w[f]===undefined)delete r.work[f];for(const f of Object.keys(w))r.work[f]=w[f];r.index={...i};}
function switchTrees(r,to){const from=headTree(r);
 for(const f of uniq([...Object.keys(from),...Object.keys(to)])){if(from[f]===to[f])continue;
  if(to[f]===undefined){delete r.work[f];delete r.index[f];}else{r.work[f]=to[f];r.index[f]=to[f];}}}

/* ---------- status helpers ---------- */
function changes(r){const head=headTree(r),idx=r.index,w=r.work;const conf=new Set(r.op?r.op.conflicts:[]);const staged=[];
 for(const f of uniq([...Object.keys(head),...Object.keys(idx)]).sort()){if(conf.has(f))continue;const h=head[f],i=idx[f];
  if(h===undefined&&i!==undefined)staged.push({f,k:'A'});else if(h!==undefined&&i===undefined)staged.push({f,k:'D'});else if(h!==i)staged.push({f,k:'M'});}
 for(const d of staged.filter(s=>s.k==='D')){const a=staged.find(x=>x.k==='A'&&idx[x.f]===head[d.f]);if(a){a.k='R';a.from=d.f;staged.splice(staged.indexOf(d),1);}}
 const unstaged=[];for(const f of Object.keys(idx).sort()){if(conf.has(f))continue;if(w[f]===undefined)unstaged.push({f,k:'D'});else if(w[f]!==idx[f])unstaged.push({f,k:'M'});}
 const untracked=Object.keys(w).filter(f=>idx[f]===undefined&&!isIgnored(r,f)).sort();
 const ignored=Object.keys(w).filter(f=>idx[f]===undefined&&isIgnored(r,f)).sort();
 return{staged,unstaged,untracked,ignored,conflicts:[...conf]};}
function dirtyFiles(r){const ch=changes(r);const s=new Set();ch.staged.forEach(x=>{s.add(x.f);if(x.from)s.add(x.from);});ch.unstaged.forEach(x=>s.add(x.f));ch.conflicts.forEach(x=>s.add(x));return s;}
function blockers(r,to){const from=headTree(r);const d=dirtyFiles(r);
 return uniq([...Object.keys(from),...Object.keys(to)]).filter(f=>from[f]!==to[f]&&(d.has(f)||(from[f]===undefined&&r.work[f]!==undefined&&r.index[f]===undefined)));}
const countRange=(r,from,to)=>{const A=ancestors(r,from);let n=0;for(const x of ancestors(r,to))if(!A.has(x))n++;return n;};

/* ---------- output ---------- */
function mkX(){const o=[];const X={o,ok:true,why:'',hood:'',clear:false,
 P:(t,c='')=>{o.push([[t,c]]);},S:(...s)=>{o.push(s.map(x=>typeof x==='string'?[x,'']:x));}};return X;}
function fail(X,msg,why){msg.split('\n').forEach(l=>X.P(l,/^(hint:|\s*\(use)/.test(l)?'y':'r'));X.ok=false;if(why)X.why=why;}
const ind=s=>'        '+s;

/* ---------- decorations for log ---------- */
function decoMap(r){const m={};const add=(id,segs)=>{if(!id)return;(m[id]=m[id]||[]).push(segs);};
 if(isDet(r))add(headId(r),[['HEAD','c']]);
 for(const[b,id]of Object.entries(r.branches)){if(!isDet(r)&&r.head.branch===b)add(id,[['HEAD -> ','c'],[b,'g']]);else add(id,[[b,'g']]);}
 for(const[t,id]of Object.entries(r.tags))add(id,[['tag: '+t,'y']]);
 for(const[k,id]of Object.entries(r.tracking))add(id,[[k,'r']]);return m;}
function decoSegs(m,id){const d=m[id];if(!d)return[];const s=[[' (','y']];d.forEach((it,i)=>{if(i)s.push([', ','y']);s.push(...it);});s.push([')','y']);return s;}

/* ---------- operations in progress (merge / pick / revert / rebase) ---------- */
function writeConflict(r,X,tree,conflicts,ot){const it={...tree};for(const c of conflicts){if(ot[c]===undefined)delete it[c];else it[c]=ot[c];}
 switchTrees(r,it);for(const c of conflicts)r.work[c]=tree[c];
 conflicts.forEach(c=>{X.P('Auto-merging '+c);X.P('CONFLICT (content): Merge conflict in '+c,'r');});}
function finishOp(r,X,msg){const op=r.op;
 if(op.conflicts.length){fail(X,'error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use \'git add/rm <file>\'\nhint: as appropriate to mark resolution and make a commit.','Git will not finish until every conflicted file is fixed and re-added (git add). Open the file, remove the <<<<<<< ======= >>>>>>> markers, then add it.');return false;}
 const m=msg||op.msg;const hid=headId(r);const parents=op.type==='merge'?[hid,op.other]:[hid];
 const id=mkCommit(r,m,{...r.index},parents);moveHead(r,id,`commit${op.type==='merge'?' (merge)':''}: ${m}`);
 X.P(`[${curName(r)||'detached HEAD'} ${id}] ${m}`);r.op=null;
 X.why=op.type==='merge'?'Merge finished! Git recorded a merge commit with TWO parents — one from each branch — joining their histories.':'Done — the conflict-resolved changes were saved as a new commit.';
 X.hood='A merge commit points to both parents, so history becomes a diamond shape in the graph.';return true;}
function abortOp(r,X,name){const op=r.op;if(!op||op.type!==name){fail(X,`fatal: There is no ${name} in progress`,'There is nothing to abort right now.');return;}
 if(op.type==='rebase'){r.branches[op.branch]=op.origHead;r.head={branch:op.branch};const t=treeOf(r,op.origHead);setTrees(r,t,t);}
 else{const t=headTree(r);setTrees(r,t,t);}
 r.op=null;X.P('Aborted — everything is back the way it was before.','g');X.why='Phew! Git threw away the half-finished operation and restored your files to how they were before you started.';}

function doMerge(r,X,tid,label,o={}){
 const hid=headId(r);
 if(isAnc(r,tid,hid)){X.P('Already up to date.');X.why='Nothing to merge — every commit on that branch is already part of yours.';return'uptodate';}
 const base=mergeBase(r,hid,tid);const bt=treeOf(r,base),tt=treeOf(r,tid),ot=headTree(r);
 const changed=new Set(statOf(bt,tt).files.map(x=>x.f));const dirty=dirtyFiles(r);const bl=[...changed].filter(f=>dirty.has(f));
 if(bl.length){fail(X,`error: Your local changes to the following files would be overwritten by merge:\n${bl.map(ind).join('\n')}\nPlease commit your changes or stash them before you merge.\nAborting`,'Merging would overwrite files you have uncommitted edits in. Commit them (or git stash) first.');return'blocked';}
 if(!o.noff&&base===hid){
  X.P(`Updating ${hid}..${tid}`);X.P('Fast-forward');const st=statOf(ot,tt);switchTrees(r,tt);r.orig=hid;moveHead(r,tid,`merge ${label}: Fast-forward`);printStat(X,st);
  X.why=`Fast-forward! Your branch had no new commits of its own, so Git simply slid the "${curName(r)||'HEAD'}" label forward to ${tid}. No merge commit needed — history stays one straight line.`;
  X.hood=`Only a pointer moved: refs/heads/${curName(r)} now holds ${tid}. Your files were updated to match that snapshot.`;return'ff';}
 const{tree,conflicts}=merge3(bt,ot,tt,'HEAD',label);
 if(conflicts.length){r.op={type:'merge',other:tid,msg:o.msg||`Merge branch '${label}'`,conflicts,ours:ot,theirs:tt};r.orig=hid;writeConflict(r,X,tree,conflicts,ot);
  X.P('Automatic merge failed; fix conflicts and then commit the result.','r');X.ok=false;
  X.why=`Conflict! Both branches changed the same part of ${conflicts.join(', ')}, and Git refuses to guess. It wrote BOTH versions into the file between <<<<<<< and >>>>>>> markers. Open the file (try: edit ${conflicts[0]}), keep what you want, then git add it and git commit.`;
  X.hood='Git 3-way merges: it compares both tips against their common ancestor. When both sides changed the same lines, it leaves markers and sets the repo into a "merging" state.';return'conflict';}
 const st=statOf(ot,tree);switchTrees(r,tree);r.orig=hid;const id=mkCommit(r,o.msg||`Merge branch '${label}'`,tree,[hid,tid]);moveHead(r,id,`merge ${label}: Merge made by the 'ort' strategy.`);
 X.P("Merge made by the 'ort' strategy.");printStat(X,st);
 X.why=`True merge! Both branches had new work, so Git combined them and created a merge commit (${id}) with two parents. Look at the graph: the two lines join together.`;
 X.hood='Git found the common ancestor, applied both sets of changes, wrote a new tree, and made a commit with parents [yours, theirs].';return'merge';}

function rebaseRun(r,X){const op=r.op;
 while(op.todo.length){const id=op.todo[0],c=r.commits[id];const ours=treeOf(r,op.cur),base=treeOf(r,c.parents[0]);
  const{tree,conflicts}=merge3(base,ours,c.tree,'HEAD',`${id} (${c.msg})`);
  if(conflicts.length){r.head={id:op.cur};setTrees(r,ours,ours);op.conflicts=conflicts;op.ours=ours;op.theirs=c.tree;writeConflict(r,X,tree,conflicts,ours);
   X.P(`error: could not apply ${id}... ${c.msg}`,'r');X.P('hint: Resolve all conflicts manually, mark them as resolved with "git add",','y');X.P('hint: then run "git rebase --continue". Or "git rebase --abort" to bail out.','y');X.ok=false;
   X.why=`Git is replaying your commits one at a time and hit a conflict on "${c.msg}". Fix the file (edit ${conflicts[0]}), git add it, then git rebase --continue.`;return;}
  op.cur=mkCommit(r,c.msg,tree,[op.cur],c.author);op.todo.shift();}
 r.branches[op.branch]=op.cur;r.head={branch:op.branch};const t=treeOf(r,op.cur);setTrees(r,t,t);
 r.reflog.unshift({id:op.cur,why:`rebase (finish): refs/heads/${op.branch} onto ${op.onto}`});r.op=null;
 X.P(`Successfully rebased and updated refs/heads/${op.branch}.`,'g');}
function doRebase(r,X,ontoId,label){
 if(isDet(r)){fail(X,'fatal: You are not currently on a branch.');return;}
 const hid=headId(r),bn=curName(r);
 if(dirtyFiles(r).size){fail(X,'error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.','Rebase rewrites commits, so Git wants a clean desk first. Commit or stash your changes.');return;}
 if(isAnc(r,ontoId,hid)){X.P(`Current branch ${bn} is up to date.`);X.why=`Your branch already includes everything from ${label}.`;return;}
 const base=mergeBase(r,hid,ontoId);
 if(base===hid){switchTrees(r,treeOf(r,ontoId));moveHead(r,ontoId,`rebase (finish): refs/heads/${bn} onto ${ontoId}`);X.P(`Successfully rebased and updated refs/heads/${bn}.`,'g');X.why='Your branch had no commits of its own, so Git just fast-forwarded it.';return;}
 const todo=[];let c=hid;while(c&&c!==base){const cm=r.commits[c];if(cm.parents.length<2)todo.unshift(c);c=cm.parents[0];}
 r.op={type:'rebase',todo,cur:ontoId,onto:label,branch:bn,origHead:hid,conflicts:[],ours:{},theirs:{}};r.orig=hid;const n=todo.length;
 rebaseRun(r,X);
 if(!r.op){X.why=`Rebased! Git lifted your ${plural(n,'commit')} off, moved to the tip of ${label}, and replayed them one by one on top. They got NEW IDs because their parent changed — the old versions are now faded "ghosts" in the graph. Result: one clean straight line, no merge commit.`;
  X.hood='Rebase = for each commit: compute its diff, apply it on the new base, make a brand-new commit. The branch label then jumps to the last new commit.';}}

function startPick(r,X,kind,id){
 const c=r.commits[id];if(c.parents.length>1){fail(X,`error: commit ${id} is a merge but no -m option was given.`);return;}
 const pt=treeOf(r,c.parents[0]),ot=headTree(r);const base=kind==='cherry-pick'?pt:c.tree,theirs=kind==='cherry-pick'?c.tree:pt;
 const changed=statOf(pt,c.tree).files.map(x=>x.f);const d=dirtyFiles(r);
 if(changed.some(f=>d.has(f))){fail(X,`error: your local changes would be overwritten by ${kind}.\nhint: commit your changes or stash them to proceed.`,'Commit or stash your uncommitted changes first.');return;}
 const msg=kind==='cherry-pick'?c.msg:`Revert "${c.msg}"`;
 const{tree,conflicts}=merge3(base,ot,theirs,'HEAD',kind==='revert'?`parent of ${id} (${c.msg})`:`${id} (${c.msg})`);
 if(conflicts.length){r.op={type:kind,id,msg,conflicts,ours:ot,theirs};writeConflict(r,X,tree,conflicts,ot);X.P(`error: could not ${kind==='revert'?'revert':'apply'} ${id}... ${c.msg}`,'r');X.ok=false;
  X.why='The change you are copying clashes with what is already there. Fix the file, git add it, then git commit (or --continue). Use --abort to cancel.';return;}
 const st=statOf(ot,tree);switchTrees(r,tree);const nid=mkCommit(r,msg,tree,[headId(r)]);moveHead(r,nid,`${kind}: ${msg}`);
 X.P(`[${curName(r)||'detached HEAD'} ${nid}] ${msg}`);printStat(X,st,true);
 if(kind==='cherry-pick'){X.why=`Cherry-picked! Git copied the changes from ${id} ("${c.msg}") onto your current branch as a brand-new commit (${nid}). Only that one commit came along — not the rest of its branch.`;X.hood='Same idea as rebase for a single commit: diff the commit against its parent, apply it here, commit with the same message.';}
 else{X.why=`Reverted! Instead of erasing history, Git made a NEW commit that does the exact opposite of ${id}. Safe for shared branches — nobody's history changes.`;X.hood='A revert commit is just the inverse patch. The original commit stays in history.';}}

/* ---------- entering branches / commits ---------- */
function enter(r,X,{id,branch,create,detach,label}){
 const to=treeOf(r,id);const bl=blockers(r,to);
 if(bl.length){fail(X,`error: Your local changes to the following files would be overwritten by checkout:\n${bl.map(ind).join('\n')}\nPlease commit your changes or stash them before you switch branches.\nAborting`,'Git protects your unsaved work: the other branch has a different version of a file you have changed. Commit it, or tuck it away with git stash, then try again.');return false;}
 const from=curName(r)||headId(r);if(curName(r))r.prevBranch=curName(r);
 if(create)r.branches[branch]=id;
 switchTrees(r,to);r.head=detach?{id}:{branch};if(detach)r.flags.sawDetached=true;
 r.reflog.unshift({id,why:`checkout: moving from ${from} to ${label||branch||id}`});return true;}

/* ================= GIT COMMANDS ================= */
const GIT={};
GIT.init=(r,a,X)=>{const{f}=parseArgs(a,['-b','--initial-branch']);const nm=val(f,'-b','--initial-branch')||r.config['init.defaultBranch']||'main';
 if(r.inited){X.P('Reinitialized existing Git repository in /home/you/garden/.git/');X.why='This folder was already a repository, so Git just double-checked it. Nothing was lost.';return;}
 r.inited=true;r.head={branch:nm};X.P('Initialized empty Git repository in /home/you/garden/.git/','g');
 X.why='Your folder is now a Git repository! Git created a hidden .git folder — that is its memory. Nothing is tracked yet; your files are just waiting to be noticed.';
 X.hood=`.git/ now holds HEAD (pointing at refs/heads/${nm}), an empty objects/ database and a refs/ folder. Your actual files were not touched.`;};
GIT.config=(r,a,X)=>{const{pos,f}=parseArgs(a);
 if(has(f,'--list','-l')){const e=Object.entries(r.config);if(!e.length)X.P('(nothing configured yet)','dim');e.forEach(([k,v])=>X.P(`${k}=${v}`));X.why='These are your saved settings. Git reads them every time it needs to know who you are.';return;}
 if(pos.length===1){const v=r.config[pos[0]];if(v===undefined)X.ok=false;else X.P(v);return;}
 if(pos.length>=2){r.config[pos[0]]=pos.slice(1).join(' ');X.why=`Saved! ${pos[0]} is now "${r.config[pos[0]]}". Git stamps your name and email on every commit you make.`;X.hood=has(f,'--global')?'Written to ~/.gitconfig (applies to every repo on your computer).':'Written to .git/config (this repo only).';return;}
 fail(X,'usage: git config [--global] <name> [<value>]');};
GIT.status=(r,a,X)=>{const{f}=parseArgs(a);const ch=changes(r);const bn=curName(r),hid=headId(r);
 if(has(f,'-s','--short')){const m={};ch.staged.forEach(s=>{m[s.f]=m[s.f]||['',' ',s.f];m[s.f][0]=s.k;if(s.k==='R')m[s.f][2]=`${s.from} -> ${s.f}`;});
  ch.unstaged.forEach(u=>{m[u.f]=m[u.f]||[' ',' ',u.f];m[u.f][1]=u.k;});ch.conflicts.forEach(c=>{m[c]=['U','U',c];});
  X.P('## '+(bn?bn+(r.upstream[bn]?'...'+r.upstream[bn]:''):'HEAD (no branch)'),'dim');
  Object.values(m).forEach(([x,y,t])=>X.S([x||' ','g'],[y,'r'],' '+t));ch.untracked.forEach(u=>X.S(['??','r'],' '+u));
  X.why='Short format: left column = staged (green), right column = not staged (red), ?? = untracked.';return;}
 X.P(bn?`On branch ${bn}`:`HEAD detached at ${hid}`);
 const up=bn&&r.upstream[bn];
 if(up&&r.tracking[up]!==undefined&&hid){const ahead=countRange(r,r.tracking[up],hid),behind=countRange(r,hid,r.tracking[up]);
  if(ahead&&behind){X.P(`Your branch and '${up}' have diverged,`);X.P(`and have ${ahead} and ${behind} different commits each, respectively.`);X.P('  (use "git pull" if you want to integrate the remote branch with yours)','y');}
  else if(ahead){X.P(`Your branch is ahead of '${up}' by ${plural(ahead,'commit')}.`);X.P('  (use "git push" to publish your local commits)','y');}
  else if(behind){X.P(`Your branch is behind '${up}' by ${plural(behind,'commit')}, and can be fast-forwarded.`);X.P('  (use "git pull" to update your local branch)','y');}
  else X.P(`Your branch is up to date with '${up}'.`);}
 if(!hid){X.P('');X.P('No commits yet');}
 if(r.op){const o=r.op;X.P('');
  if(o.type==='merge'){if(o.conflicts.length){X.P('You have unmerged paths.');X.P('  (fix conflicts and run "git commit")','y');X.P('  (use "git merge --abort" to abort the merge)','y');}else{X.P('All conflicts fixed but you are still merging.');X.P('  (use "git commit" to conclude merge)','y');}}
  else if(o.type==='rebase'){X.P(`You are currently rebasing branch '${o.branch}' on '${o.onto}'.`);X.P('  (fix conflicts and then run "git rebase --continue")','y');X.P('  (use "git rebase --abort" to check out the original branch)','y');}
  else{X.P(`You are currently ${o.type==='revert'?'reverting':'cherry-picking'} commit ${o.id}.`);X.P(`  (fix conflicts and run "git commit")`,'y');X.P(`  (use "git ${o.type} --abort" to cancel)`,'y');}}
 X.P('');
 const sec=(t,hs,rows,c)=>{X.P(t);hs.forEach(h=>X.P(`  (${h})`,'y'));X.P('');rows.forEach(x=>X.S([ind(x),c]));X.P('');};
 if(ch.staged.length)sec('Changes to be committed:',[hid?'use "git restore --staged <file>..." to unstage':'use "git rm --cached <file>..." to unstage'],ch.staged.map(s=>({A:'new file:   ',M:'modified:   ',D:'deleted:    ',R:'renamed:    '}[s.k])+(s.k==='R'?`${s.from} -> ${s.f}`:s.f)),'g');
 if(ch.conflicts.length)sec('Unmerged paths:',['use "git add <file>..." to mark resolution'],ch.conflicts.map(c=>'both modified:   '+c),'r');
 if(ch.unstaged.length)sec('Changes not staged for commit:',['use "git add <file>..." to update what will be committed','use "git restore <file>..." to discard changes in working directory'],ch.unstaged.map(u=>(u.k==='D'?'deleted:    ':'modified:   ')+u.f),'r');
 if(ch.untracked.length){const dirs=uniq(ch.untracked.map(u=>u.includes('/')?u.split('/')[0]+'/':u));sec('Untracked files:',['use "git add <file>..." to include in what will be committed'],dirs,'r');}
 if(has(f,'--ignored')&&ch.ignored.length)sec('Ignored files:',[],ch.ignored,'dim');
 if(!ch.staged.length){if(ch.unstaged.length||ch.conflicts.length)X.P(ch.conflicts.length?'':'no changes added to commit (use "git add" and/or "git commit -a")');else if(ch.untracked.length)X.P('nothing added to commit but untracked files present (use "git add" to track)');else if(!hid&&!Object.keys(r.work).length)X.P('nothing to commit (create/copy files and use "git add" to track)');else X.P('nothing to commit, working tree clean');}
 X.why=ch.conflicts.length?'Unmerged paths = conflicts waiting for you. Fix the files, then git add them.':
  ch.staged.length&&!ch.unstaged.length&&!ch.untracked.length?'Everything is staged (green). The next git commit will save it all.':
  (ch.staged.length||ch.unstaged.length||ch.untracked.length)?'Status is your dashboard: green = in the basket (staged), red = changed or new but NOT in the basket yet.':'Clean! Your working folder, staging area and last commit all match.';
 X.hood='status compares three things: HEAD (last commit) vs the index (staging), and the index vs your working files.';};
GIT.add=(r,a,X)=>{const{pos,f}=parseArgs(a);
 if(has(f,'-p','--patch','-i','--interactive')){X.P('(Interactive add lets you stage individual chunks of a file. Not simulated in the garden — try git add <file>.)','dim');X.why='git add -p walks you through each changed "hunk" and asks y/n. Great for making small, focused commits.';return;}
 let specs=pos;if(has(f,'-A','--all'))specs=['.'];if(!specs.length){if(has(f,'-u','--update'))specs=['.'];else{X.P('Nothing specified, nothing added.');X.P("hint: Maybe you wanted to say 'git add .'?",'y');X.ok=false;X.why='git add needs to know WHAT to stage. Use a file name, or . for everything.';return;}}
 const upd=has(f,'-u','--update');const cand=uniq([...Object.keys(r.work),...Object.keys(r.index)]);const added=[],ign=[];
 for(const spec of specs){const hits=cand.filter(x=>matchSpec(spec,x));
  if(!hits.length){fail(X,`fatal: pathspec '${spec}' did not match any files`,'Git could not find a file with that name. Check spelling with ls.');return;}
  for(const file of hits){const inIdx=r.index[file]!==undefined;
   if(!inIdx&&isIgnored(r,file)&&!has(f,'-f')){ign.push(file);continue;}
   if(upd&&!inIdx)continue;
   const wasConf=r.op&&r.op.conflicts.includes(file);if(wasConf){r.op.conflicts=r.op.conflicts.filter(c=>c!==file);if(/^<<<<<<< /m.test(r.work[file]||''))X.P(`warning: ${file} still contains conflict markers!`,'y');}
   if(r.work[file]===undefined){if(inIdx){delete r.index[file];added.push(file);}}
   else if(r.index[file]!==r.work[file]||wasConf){if(r.index[file]!==r.work[file])added.push(file);r.index[file]=r.work[file];}}}
 if(ign.length){X.P('The following paths are ignored by one of your .gitignore files:');ign.forEach(i=>X.P(i));X.P('hint: Use -f if you really want to add them.','y');}
 X.why=added.length?`Staged ${plural(added.length,'file')}: ${added.slice(0,4).join(', ')}${added.length>4?'…':''}. They're in the basket now — the next commit will include them exactly as they are at this moment.`:ign.length?'Those files are on your .gitignore list, so Git politely skipped them.':'Nothing new to stage — those files already match the staging area.';
 X.hood='Git hashed each file into a blob object in .git/objects and recorded the filename → blob in the index (.git/index).';};
GIT.commit=(r,a,X)=>{const{f}=parseArgs(a,['-m','--message']);let msg=val(f,'-m','--message');const amend=has(f,'--amend'),all=has(f,'-a','--all');
 if(r.op&&r.op.type==='rebase'){fail(X,'error: you are in the middle of a rebase.\nhint: use "git rebase --continue" after fixing conflicts.','During a rebase, finish each step with git rebase --continue.');return;}
 if(all){const cs=new Set(r.op?r.op.conflicts:[]);for(const k of Object.keys(r.index)){if(cs.has(k))continue;if(r.work[k]===undefined)delete r.index[k];else r.index[k]=r.work[k];}}
 if(r.op){finishOp(r,X,msg);return;}
 const ch=changes(r);
 if(!amend&&!ch.staged.length){X.P(`On branch ${curName(r)||'(detached)'}`);
  if(ch.unstaged.length){X.P('Changes not staged for commit:');ch.unstaged.forEach(u=>X.S([ind((u.k==='D'?'deleted:    ':'modified:   ')+u.f),'r']));X.P('');X.P('no changes added to commit (use "git add" and/or "git commit -a")');}
  else if(ch.untracked.length){X.P('Untracked files:');ch.untracked.forEach(u=>X.S([ind(u),'r']));X.P('');X.P('nothing added to commit but untracked files present (use "git add" to track)');}
  else X.P('nothing to commit, working tree clean');
  X.ok=false;X.why='The staging area is empty, so there is nothing to snapshot. A commit only records what you put in the basket with git add — stage something first.';return;}
 const hid=headId(r);if(amend&&!hid){fail(X,'fatal: You have nothing to amend.');return;}
 if(!msg){if(amend)msg=r.commits[hid].msg;else{fail(X,'Aborting commit due to empty commit message.\n(Real Git would open a text editor here. In the garden, use:  git commit -m "your message")','Every commit needs a message so future-you knows why it exists. Add -m "message".');return;}}
 const tree={...r.index};let id,oldT;
 if(amend){const old=r.commits[hid];oldT=treeOf(r,old.parents[0]);id=mkCommit(r,msg,tree,old.parents,old.author);}else{oldT=headTree(r);id=mkCommit(r,msg,tree,hid?[hid]:[]);}
 const root=!hid;moveHead(r,id,(root?'commit (initial)':amend?'commit (amend)':'commit')+': '+msg);
 X.P(`[${curName(r)||'detached HEAD'}${root?' (root-commit)':''} ${id}] ${msg}`);printStat(X,statOf(oldT,tree),true);
 X.why=amend?`Amended! You swapped the last commit for a fresh one (${id}). The old one is orphaned — still findable with git reflog for a while. Only amend commits you have NOT pushed.`:
  `Snapshot saved! Git bundled the staged files into commit ${id} and moved "${curName(r)||'HEAD'}" forward to it. The basket is empty again.`;
 X.hood='Git wrote a tree object (a snapshot of the whole index), then a commit object pointing at that tree and at its parent, then moved the branch label.';};
GIT.log=(r,a,X)=>{const{pos,f}=parseArgs(a,['-n','--max-count','--author','--pretty','--format']);
 let n=Infinity;const nv=val(f,'-n','--max-count');if(nv)n=parseInt(nv,10);a.forEach(t=>{if(/^-\d+$/.test(t))n=parseInt(t.slice(1),10);});
 const revs=pos.filter(p=>!/^-\d+$/.test(p));const one=has(f,'--oneline')||f['--pretty']==='oneline'||f['--format']==='oneline';let inc=[],exc=[];
 if(has(f,'--all'))inc=uniq([...Object.values(r.branches),...Object.values(r.tracking),...(headId(r)?[headId(r)]:[])]);
 else if(!revs.length){if(!headId(r)){fail(X,`fatal: your current branch '${curName(r)}' does not have any commits yet`,'No commits yet — make your first one with git add + git commit.');return;}inc=[headId(r)];}
 else for(const rv of revs){if(rv.includes('..')){const[l,rr]=rv.split('..');const li=resolveRev(r,l||'HEAD'),ri=resolveRev(r,rr||'HEAD');if(!li||!ri){fail(X,`fatal: ambiguous argument '${rv}': unknown revision or path not in the working tree.`);return;}exc.push(li);inc.push(ri);}
  else{const id=resolveRev(r,rv);if(!id){fail(X,`fatal: ambiguous argument '${rv}': unknown revision or path not in the working tree.`,"Git doesn't know that branch/commit. Try git branch or git log --oneline.");return;}inc.push(id);}}
 const ex=new Set();exc.forEach(e=>ancestors(r,e).forEach(x=>ex.add(x)));const set=new Set();inc.forEach(i=>ancestors(r,i).forEach(x=>{if(!ex.has(x))set.add(x);}));
 let list=[...set].map(i=>r.commits[i]).sort((x,y)=>y.seq-x.seq);const au=val(f,'--author');if(au)list=list.filter(c=>c.author.toLowerCase().includes(au.toLowerCase()));list=list.slice(0,n);
 const dm=decoMap(r);const gp=has(f,'--graph')?'* ':'';
 list.forEach(c=>{if(one)X.S(gp,[c.id,'y'],...decoSegs(dm,c.id),' '+c.msg);
  else{X.S(gp,['commit '+full(c.id),'y'],...decoSegs(dm,c.id));if(c.parents.length>1)X.P('Merge: '+c.parents.join(' '));X.P(`Author: ${c.author} <${emailOf(c.author)}>`);X.P('Date:   '+fmtDate(c.seq));X.P('');X.P('    '+c.msg);X.P('');}});
 X.why='Log lists commits newest-first. Each has a short ID (its hash), labels showing where branches/HEAD point, and its message. Add --oneline for a compact view.';
 X.hood='Git walks backwards from your starting commit, following each commit\'s parent pointer, like following a linked list.';};
GIT.diff=(r,a,X)=>{const{pos,f}=parseArgs(a);const staged=has(f,'--staged','--cached');const revs=[],paths=[];
 for(const p of pos){if(p.includes('..')){const[l,rr]=p.split('..');revs.push(resolveRev(r,l||'HEAD'),resolveRev(r,rr||'HEAD'));}else if(!(r.work[p]!==undefined||r.index[p]!==undefined)&&resolveRev(r,p))revs.push(resolveRev(r,p));else paths.push(p);}
 if(revs.includes(null)){fail(X,"fatal: bad revision. Check the names with git log --oneline / git branch.");return;}
 const wt=keys=>{const t={};keys.forEach(k=>{if(r.work[k]!==undefined)t[k]=r.work[k];});return t;};let a1,b1;
 if(revs.length>=2){a1=treeOf(r,revs[0]);b1=treeOf(r,revs[1]);}else if(staged){a1=revs.length?treeOf(r,revs[0]):headTree(r);b1=r.index;}
 else if(revs.length===1){a1=treeOf(r,revs[0]);b1=wt(uniq([...Object.keys(a1),...Object.keys(r.index)]));}else{a1=r.index;b1=wt(Object.keys(r.index));}
 const n=showDiff(X,a1,b1,{paths,nameOnly:has(f,'--name-only'),stat:has(f,'--stat')});
 X.why=n?(staged?'This is what your NEXT commit will record: staging area vs last commit. Green + lines are additions, red - lines are removals.':'These are your edits that are NOT staged yet (working folder vs staging area). Green + = added lines, red - = removed lines.'):
  (staged?'No staged changes. Use git add to stage something, then diff --staged shows it.':'No unstaged changes. (New untracked files never show up in git diff — and staged changes are shown by git diff --staged.)');
 X.hood='diff compares two snapshots line-by-line (a longest-common-subsequence match) and prints only what differs.';};
GIT.show=(r,a,X)=>{const{pos}=parseArgs(a);const spec=pos[0]||'HEAD';const id=resolveRev(r,spec);
 if(!id){fail(X,`fatal: ambiguous argument '${spec}': unknown revision or path not in the working tree.`);return;}
 if(r.tagMsg[spec]){X.S([`tag ${spec}`,'y']);X.P('Tagger: '+(r.config['user.name']||'You'));X.P('');X.P(r.tagMsg[spec]);X.P('');}
 const c=r.commits[id];X.S(['commit '+full(id),'y'],...decoSegs(decoMap(r),id));X.P(`Author: ${c.author} <${emailOf(c.author)}>`);X.P('Date:   '+fmtDate(c.seq));X.P('');X.P('    '+c.msg);X.P('');
 showDiff(X,treeOf(r,c.parents[0]),c.tree);X.why='show prints one commit: who/when/why, plus exactly what it changed compared with its parent.';};
function restoreFiles(r,X,specs,src,stage,wt){
 for(const spec of specs){const hits=uniq([...Object.keys(src),...Object.keys(r.index),...(wt?Object.keys(r.work):[])]).filter(x=>matchSpec(spec,x)&&(src[x]!==undefined||r.index[x]!==undefined));
  if(!hits.length){fail(X,`error: pathspec '${spec}' did not match any file(s) known to git`,'Git can only restore files it already knows (tracked ones). Check the name with git status.');return false;}
  for(const x of hits){if(stage){if(src[x]===undefined)delete r.index[x];else r.index[x]=src[x];}if(wt){if(src[x]===undefined)delete r.work[x];else r.work[x]=src[x];}}}return true;}
GIT.restore=(r,a,X)=>{const{pos,f}=parseArgs(a,['-s','--source']);const stage=has(f,'--staged','-S'),wt=has(f,'--worktree','-W')||!stage;const s=val(f,'-s','--source');
 if(!pos.length){fail(X,'fatal: you must specify path(s) to restore','Tell restore which file(s) to bring back, e.g. git restore notes.txt');return;}
 let src;if(s){const id=resolveRev(r,s);if(!id){fail(X,`fatal: could not resolve ${s}`);return;}src=treeOf(r,id);}else src=stage?headTree(r):r.index;
 if(!restoreFiles(r,X,pos,src,stage,wt))return;
 X.why=stage&&!wt?'Un-staged! The file left the basket but your edits are still safe in your working folder. Nothing was lost.':s?`Restored from ${s}. The file now matches that older snapshot.`:'Edits discarded! The file in your working folder now matches the staging area again. ⚠️ Unsaved changes cannot be recovered.';
 X.hood=stage&&!wt?'The index entry was reset to the HEAD version; your working file was left alone.':'Git copied the stored version of the file back over your working copy.';};
GIT.reset=(r,a,X)=>{const{pos,f}=parseArgs(a);const mode=f['--hard']?'hard':f['--soft']?'soft':'mixed';let target=null,paths=[];
 if(pos.length){const t=resolveRev(r,pos[0]);if(t){target=t;paths=pos.slice(1);}else if(uniq([...Object.keys(r.index),...Object.keys(headTree(r)),...Object.keys(r.work)]).some(x=>matchSpec(pos[0],x)))paths=pos;else{fail(X,`fatal: ambiguous argument '${pos[0]}': unknown revision or path not in the working tree.`,"That isn't a commit, branch or file. Check git log --oneline.");return;}}
 if(paths.length){const src=target?treeOf(r,target):headTree(r);for(const p of paths)uniq([...Object.keys(r.index),...Object.keys(src)]).filter(x=>matchSpec(p,x)).forEach(x=>{if(src[x]===undefined)delete r.index[x];else r.index[x]=src[x];});
  X.why='Un-staged those files (the classic way — git restore --staged does the same). Your edits remain in the working folder.';return;}
 if(!target)target=headId(r);if(!target){fail(X,'fatal: Failed to resolve HEAD as a valid ref.');return;}
 const oldT=headTree(r),nt=treeOf(r,target);r.orig=headId(r);
 if(mode==='hard'){for(const x of uniq([...Object.keys(r.index),...Object.keys(oldT)]))if(nt[x]===undefined)delete r.work[x];for(const x of Object.keys(nt))r.work[x]=nt[x];r.index={...nt};r.op=null;}
 else if(mode==='mixed')r.index={...nt};
 moveHead(r,target,`reset: moving to ${pos[0]||'HEAD'}`);const c=r.commits[target];
 if(mode==='hard')X.P(`HEAD is now at ${target} ${c.msg}`);else if(mode==='mixed'){const un=[];for(const x of Object.keys(r.index)){if(r.work[x]!==r.index[x])un.push(x);}if(un.length){X.P('Unstaged changes after reset:');un.forEach(x=>X.P('M\t'+x));}}
 X.why={soft:`Soft reset: the branch pointer moved back to ${target}, but your files AND staging area are untouched — the "undone" commits' changes sit staged, ready to re-commit.`,
  mixed:`Mixed reset (the default): the branch moved to ${target} and the staging area was cleared, but your files still hold your changes — they're just un-staged now.`,
  hard:`Hard reset: branch, staging area AND files all jumped back to ${target}. ⚠️ Uncommitted work is gone. The abandoned commits are orphaned but rescue-able via git reflog.`}[mode];
 X.hood='reset moves the branch label. --soft stops there; --mixed also resets the index; --hard also overwrites the working files.';};
GIT.revert=(r,a,X)=>{const{pos,f}=parseArgs(a);if(has(f,'--abort')){abortOp(r,X,'revert');return;}if(has(f,'--continue')){if(!r.op||r.op.type!=='revert')fail(X,'error: no revert in progress');else finishOp(r,X);return;}
 const id=resolveRev(r,pos[0]||'HEAD');if(!id){fail(X,`fatal: bad revision '${pos[0]}'`,'Find the commit ID with git log --oneline.');return;}startPick(r,X,'revert',id);};
GIT['cherry-pick']=(r,a,X)=>{const{pos,f}=parseArgs(a);if(has(f,'--abort')){abortOp(r,X,'cherry-pick');return;}if(has(f,'--continue')){if(!r.op||r.op.type!=='cherry-pick')fail(X,'error: no cherry-pick in progress');else finishOp(r,X);return;}
 if(!pos.length){fail(X,'error: switch: you must specify a commit to cherry-pick','Give me a commit ID — find one with git log <branch> --oneline.');return;}
 const id=resolveRev(r,pos[0]);if(!id){fail(X,`fatal: bad revision '${pos[0]}'`);return;}startPick(r,X,'cherry-pick',id);};
GIT.branch=(r,a,X)=>{const{pos,f}=parseArgs(a,['-u','--set-upstream-to']);const bn=curName(r);
 if(has(f,'-d','-D','--delete')){for(const n of pos){const id=r.branches[n];if(!id){fail(X,`error: branch '${n}' not found.`);continue;}
   if(n===bn){fail(X,`error: Cannot delete branch '${n}' checked out at '/home/you/garden'`,"You're standing on that branch! Switch to another branch first.");continue;}
   if(!f['-D']&&!f['--force']&&!isAnc(r,id,headId(r))){fail(X,`error: The branch '${n}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${n}'.`,`Git is protecting you: "${n}" has commits that exist nowhere else. If you really want to throw them away, use a capital -D.`);continue;}
   delete r.branches[n];delete r.upstream[n];X.P(`Deleted branch ${n} (was ${id}).`);X.why=`Deleted the label "${n}". The commits are still in the database — if they were merged, nothing is lost; if not, they're only reachable via git reflog.`;}return;}
 if(has(f,'-m','-M','--move')){const[o,nw]=pos.length>1?pos:[bn,pos[0]];if(!r.branches[o]||!nw){fail(X,'error: usage: git branch -m <old> <new>');return;}if(r.branches[nw]){fail(X,`fatal: a branch named '${nw}' already exists`);return;}
  r.branches[nw]=r.branches[o];delete r.branches[o];if(r.upstream[o]){r.upstream[nw]=r.upstream[o];delete r.upstream[o];}if(r.head.branch===o)r.head.branch=nw;X.why=`Renamed "${o}" to "${nw}". Only the label changed; the commits are the same.`;return;}
 const up=val(f,'-u','--set-upstream-to');if(up){const tr=r.tracking[up];if(!tr){fail(X,`fatal: the requested upstream branch '${up}' does not exist`,'Run git fetch first so Git knows the remote branches.');return;}r.upstream[bn]=up;X.P(`branch '${bn}' set up to track '${up}'.`);X.why=`Now "${bn}" is linked to ${up}, so plain git push / git pull know where to go.`;return;}
 if(!pos.length){const rows=[];const vflag=has(f,'-v','-vv');
  if(!has(f,'-r'))Object.keys(r.branches).sort().forEach(n=>rows.push({n,cur:n===bn,id:r.branches[n]}));
  if(has(f,'-a','-r'))Object.keys(r.tracking).sort().forEach(n=>rows.push({n:'remotes/'+n,id:r.tracking[n],rem:true}));
  if(isDet(r)&&headId(r))rows.unshift({n:`(HEAD detached at ${headId(r)})`,cur:true,id:headId(r)});
  if(!rows.length){X.P('(no branches yet — make a first commit)','dim');}
  rows.forEach(x=>X.S([(x.cur?'* ':'  ')+x.n,x.cur?'g':x.rem?'r':''],...(vflag?[' '+x.id+' '+(r.commits[x.id]?.msg||'')]:[])));
  X.why='The * marks the branch you are on. A branch is just a movable label pointing at a commit — cheap to create, cheap to delete.';return;}
 const name=pos[0],start=pos[1];if(r.branches[name]){fail(X,`fatal: a branch named '${name}' already exists`);return;}
 const id=start?resolveRev(r,start):headId(r);if(!id){fail(X,`fatal: not a valid object name: '${start||curName(r)||'HEAD'}'.`,'You need at least one commit before you can branch.');return;}
 r.branches[name]=id;X.why=`Created a new label "${name}" pointing at ${id}. You're still on "${curName(r)||'HEAD'}" — use git switch ${name} to hop over.`;X.hood='Creating a branch writes a 41-byte file: .git/refs/heads/'+name+' containing a commit ID.';};
function switchCmd(r,a,X,co){const{pos,f}=parseArgs(a,['-c','-C','-b','-B','-s','--source']);const cr=val(f,'-c','-C','-b','-B');
 if(co&&(has(f,'--ours','--theirs'))){const fl=f['--ours']?'ours':'theirs';if(!r.op){fail(X,'error: --ours/--theirs only apply during a conflict');return;}for(const p of pos){const side=r.op[fl];if(side[p]===undefined)delete r.work[p];else r.work[p]=side[p];}X.why=`Took the ${fl==='ours'?'version from your side (HEAD)':'incoming version'} for those files. Now git add them to mark the conflict resolved.`;return;}
 if(cr){const hid=headId(r);const id=pos[0]?resolveRev(r,pos[0]):hid;if(r.branches[cr]&&!f['-C']&&!f['-B']){fail(X,`fatal: a branch named '${cr}' already exists`);return;}
  if(!hid&&!pos[0]){r.head={branch:cr};X.P(`Switched to a new branch '${cr}'`);return;}if(!id){fail(X,`fatal: invalid reference: ${pos[0]}`);return;}
  if(!enter(r,X,{id,branch:cr,create:true}))return;X.P(`Switched to a new branch '${cr}'`);X.why=`Created "${cr}" and hopped onto it in one move. Commits you make now go on "${cr}" and leave "${r.prevBranch||'the old branch'}" untouched.`;X.hood=`Wrote refs/heads/${cr}, then pointed HEAD at it (HEAD is a pointer to the branch you're on).`;return;}
 if(co&&(f['--']||(pos.length&&!r.branches[pos[0]]&&!resolveRev(r,pos[0])&&(r.index[pos[0]]!==undefined||pos[0]==='.'))||(f['--']&&!pos.length))){
  let src=r.index,files=pos;if(pos.length&&resolveRev(r,pos[0])&&f['--']){src=treeOf(r,resolveRev(r,pos[0]));files=pos.slice(1);}
  if(!files.length){fail(X,'fatal: nothing to restore');return;}
  if(!restoreFiles(r,X,files,src,src!==r.index,true))return;X.why='Restored the file(s) from the saved version (old-school way — git restore does the same, and is clearer).';return;}
 let t=pos[0];if(!t){fail(X,'fatal: missing branch or commit argument');return;}
 if(t==='-'){t=r.prevBranch;if(!t||!r.branches[t]){fail(X,'fatal: invalid reference: @{-1}');return;}}
 if(r.branches[t]&&!has(f,'--detach')){if(curName(r)===t){X.P(`Already on '${t}'`);return;}
  if(!enter(r,X,{id:r.branches[t],branch:t}))return;X.P(`Switched to branch '${t}'`);const up=r.upstream[t];if(up&&r.tracking[up]){const ah=countRange(r,r.tracking[up],r.branches[t]),be=countRange(r,r.branches[t],r.tracking[up]);if(be&&!ah)X.P(`Your branch is behind '${up}' by ${plural(be,'commit')}, and can be fast-forwarded.`);}
  X.why=`You're on "${t}" now. Git swapped your working files to match the latest snapshot of this branch. Any uncommitted changes that don't clash travel along with you.`;X.hood=`HEAD now says "ref: refs/heads/${t}", and the files in your folder were rewritten to that commit's snapshot.`;return;}
 const rn=r.remote&&r.remote.name;if(!has(f,'--detach')&&rn&&r.tracking[`${rn}/${t}`]){const id=r.tracking[`${rn}/${t}`];if(!enter(r,X,{id,branch:t,create:true}))return;r.upstream[t]=`${rn}/${t}`;X.P(`branch '${t}' set up to track '${rn}/${t}'.`);X.P(`Switched to a new branch '${t}'`);X.why=`Git noticed ${rn}/${t} on the remote, made a local branch "${t}" from it and linked them (tracking).`;return;}
 const id=resolveRev(r,t);
 if(id&&(co||has(f,'--detach'))){if(!enter(r,X,{id,detach:true,label:t}))return;const c=r.commits[id];
  X.P(`Note: switching to '${t}'.`);X.P('');X.P("You are in 'detached HEAD' state. You can look around, make experimental changes and commit them, but they will be lost unless you create a branch.");X.P('');X.P(`HEAD is now at ${id} ${c.msg}`);
  X.why=`Time travel! Your files now match commit ${id}. HEAD points straight at a commit instead of a branch ("detached"). Look around freely — to go home, git switch ${r.prevBranch||'main'}. To keep new work from here, make a branch first (git switch -c name).`;X.hood='HEAD normally contains a branch name; now it contains a raw commit ID.';return;}
 if(id&&!co){fail(X,`fatal: a branch is expected, got commit '${t}'`,'git switch only moves between branches. To visit an old commit use git switch --detach <id> (or git checkout <id>).');return;}
 if(co&&r.work[t]!==undefined){if(!restoreFiles(r,X,pos,r.index,false,true))return;X.why='Restored that file from the staging area.';return;}
 fail(X,co?`error: pathspec '${t}' did not match any file(s) known to git`:`fatal: invalid reference: ${t}`,"Git can't find that branch. List them with git branch (or git branch -a to include remote ones).");}
GIT.switch=(r,a,X)=>switchCmd(r,a,X,false);GIT.checkout=(r,a,X)=>switchCmd(r,a,X,true);
GIT.merge=(r,a,X)=>{const{pos,f}=parseArgs(a,['-m','--message']);
 if(has(f,'--abort')){abortOp(r,X,'merge');return;}
 if(has(f,'--continue')){if(!r.op||r.op.type!=='merge')fail(X,'fatal: There is no merge in progress (MERGE_HEAD missing).');else finishOp(r,X);return;}
 if(!pos.length){fail(X,'fatal: No remote for the current branch.','Tell merge which branch to bring in, e.g. git merge feature');return;}
 if(r.op){fail(X,'error: You have not concluded your merge (MERGE_HEAD exists).\nhint: Please, commit your changes before you merge.','Finish the current merge first (git commit) or cancel it with git merge --abort.');return;}
 const tid=resolveRev(r,pos[0]);if(!tid){fail(X,`merge: ${pos[0]} - not something we can merge`,"That branch doesn't exist. Check names with git branch.");return;}
 if(!headId(r)){fail(X,'fatal: You have no commits yet.');return;}
 if(has(f,'--squash')){X.P('(--squash isn\'t simulated: it would stage all of that branch\'s changes without making a merge commit.)','dim');X.why='--squash folds a whole branch into ONE new commit that you make yourself. Handy for tidy history.';return;}
 const lbl=r.branches[pos[0]]?`branch '${pos[0]}'`:r.tracking[pos[0]]?`remote-tracking branch '${pos[0]}'`:`commit '${pos[0]}'`;const into=curName(r)&&!['main','master'].includes(curName(r))?` into ${curName(r)}`:'';
 doMerge(r,X,tid,pos[0],{noff:has(f,'--no-ff'),msg:val(f,'-m','--message')||`Merge ${lbl}${into}`});};
GIT.rebase=(r,a,X)=>{const{pos,f}=parseArgs(a);
 if(has(f,'--abort')){abortOp(r,X,'rebase');return;}
 if(has(f,'--continue')){const op=r.op;if(!op||op.type!=='rebase'){fail(X,'fatal: No rebase in progress?');return;}
  if(op.conflicts.length){fail(X,'error: Committing is not possible because you have unmerged files.\nhint: Fix them, then "git add" the files.','Fix every conflicted file and git add it before continuing.');return;}
  const id=op.todo[0],c=r.commits[id];op.cur=mkCommit(r,c.msg,{...r.index},[op.cur],c.author);op.todo.shift();rebaseRun(r,X);if(!r.op)X.why='Rebase finished! Your commits were replayed on top of the new base.';return;}
 if(has(f,'-i','--interactive')){X.P('hint: Interactive rebase opens an editor where you can pick, reword, squash or drop commits.','y');X.P('(Not simulated in the garden — try a plain  git rebase <branch>  instead.)','dim');X.why='git rebase -i lets you rewrite a series of commits: reorder, combine (squash), reword, or drop them. Powerful — but only on commits you have not shared!';return;}
 if(r.op){fail(X,'fatal: It seems that there is already a rebase/merge in progress.');return;}
 let tid,lbl=pos[0];if(!lbl){const bn=curName(r);const up=bn&&r.upstream[bn];if(!up){fail(X,'There is no tracking information for the current branch.\nPlease specify which branch you want to rebase against.');return;}lbl=up;}
 tid=resolveRev(r,lbl);if(!tid){fail(X,`fatal: invalid upstream '${lbl}'`,"That branch doesn't exist. Check git branch.");return;}doRebase(r,X,tid,lbl);};
GIT.stash=(r,a,X)=>{const{pos,f}=parseArgs(a,['-m','--message']);const sub=pos[0]||'push';const m=(pos[1]||'').match(/stash@\{(\d+)\}/);const i=m?+m[1]:0;
 if(sub==='push'||sub==='save'){const head=headTree(r);
  const files=uniq([...Object.keys(head),...Object.keys(r.index)]).filter(x=>head[x]!==r.index[x]||r.index[x]!==r.work[x]);
  const untr=has(f,'-u','--include-untracked')?changes(r).untracked:[];
  if(!files.length&&!untr.length){X.P('No local changes to save');X.ok=false;X.why='Nothing to stash — your tracked files have no changes. (New untracked files need git stash -u.)';return;}
  const hid=headId(r),msg=val(f,'-m','--message');const label=msg?`On ${curName(r)||'(no branch)'}: ${msg}`:`WIP on ${curName(r)||'(no branch)'}: ${hid} ${r.commits[hid].msg}`;
  const e={label,base:hid,files,wk:{},ix:{},untr:{}};files.forEach(x=>{e.wk[x]=r.work[x];e.ix[x]=r.index[x];});untr.forEach(x=>{e.untr[x]=r.work[x];});
  r.stash.unshift(e);files.forEach(x=>{if(head[x]===undefined){delete r.work[x];delete r.index[x];}else{r.work[x]=head[x];r.index[x]=head[x];}});untr.forEach(x=>delete r.work[x]);r.flags.sawStash=true;
  X.P('Saved working directory and index state '+label);X.why=`Tucked away! Your changes to ${files.concat(untr).join(', ')} are now on the stash shelf and your folder is clean again — free to switch branches. Bring them back with git stash pop.`;X.hood='A stash is saved as special commits under refs/stash. Your working files were reset to match HEAD.';return;}
 if(sub==='list'){if(!r.stash.length)X.P('(the stash shelf is empty)','dim');r.stash.forEach((e,k)=>X.P(`stash@{${k}}: ${e.label}`));X.why='Each entry is a saved bundle of changes. Newest is stash@{0}.';return;}
 if(sub==='clear'){r.stash=[];X.why='Whole stash shelf cleared.';return;}
 if(sub==='drop'){if(!r.stash[i]){fail(X,'error: No stash entries found.');return;}r.stash.splice(i,1);X.P(`Dropped stash@{${i}}`);X.why='That stash entry was thrown away.';return;}
 if(sub==='show'){const e=r.stash[i];if(!e){fail(X,'error: No stash entries found.');return;}const bt=treeOf(r,e.base);const o={},n={};e.files.forEach(x=>{if(bt[x]!==undefined)o[x]=bt[x];if(e.wk[x]!==undefined)n[x]=e.wk[x];});printStat(X,statOf(o,n));X.why='A summary of what is hiding in that stash.';return;}
 if(sub==='pop'||sub==='apply'){const e=r.stash[i];if(!e){fail(X,'error: No stash entries found.','The shelf is empty — stash something first.');return;}
  const bt=treeOf(r,e.base);const B={},O={},T={};e.files.forEach(x=>{if(bt[x]!==undefined)B[x]=bt[x];if(r.work[x]!==undefined)O[x]=r.work[x];if(e.wk[x]!==undefined)T[x]=e.wk[x];});
  const{tree,conflicts}=merge3(B,O,T,'Updated upstream','Stashed changes');
  e.files.forEach(x=>{if(tree[x]===undefined)delete r.work[x];else r.work[x]=tree[x];if(e.ix[x]!==undefined&&headTree(r)[x]===undefined&&!conflicts.includes(x))r.index[x]=e.ix[x];});Object.assign(r.work,e.untr);
  if(conflicts.length){conflicts.forEach(c=>X.P('CONFLICT (content): Merge conflict in '+c,'r'));X.P('The stash entry is kept in case you need it again.');X.ok=false;X.why='The stashed edits clash with changes that now exist in this branch. Fix the markers (try: edit <file>) and carry on. The stash was kept.';return;}
  if(sub==='pop')r.stash.splice(i,1);r.flags.sawPop=true;GIT.status(r,[],{...X,why:'',hood:'',P:X.P,S:X.S});X.why=sub==='pop'?'Welcome back! Your stashed edits were re-applied to your working files and removed from the shelf.':'Re-applied the stash but kept a copy on the shelf (apply keeps it, pop removes it).';X.hood='Git did a 3-way merge between the stash, the commit it was based on, and your current files.';return;}
 fail(X,`error: unknown stash command '${sub}'`);};
GIT.tag=(r,a,X)=>{const{pos,f}=parseArgs(a,['-m','--message']);
 if(has(f,'-d','--delete')){pos.forEach(t=>{if(r.tags[t]){delete r.tags[t];delete r.tagMsg[t];X.P(`Deleted tag '${t}'`);}else fail(X,`error: tag '${t}' not found.`);});return;}
 if(!pos.length||has(f,'-l','--list')){Object.keys(r.tags).sort().forEach(t=>X.P(t));if(!Object.keys(r.tags).length)X.P('(no tags yet)','dim');X.why='Tags are bookmarks — usually release numbers like v1.0.0.';return;}
 const name=pos[0],id=pos[1]?resolveRev(r,pos[1]):headId(r);if(!id){fail(X,'fatal: Failed to resolve HEAD as a valid ref.');return;}
 if(r.tags[name]){fail(X,`fatal: tag '${name}' already exists`);return;}
 const ann=has(f,'-a','--annotate')||val(f,'-m','--message');if(ann){const msg=val(f,'-m','--message');if(!msg){fail(X,'fatal: no tag message? (add -m "message")');return;}r.tagMsg[name]=msg;}
 r.tags[name]=id;X.why=ann?`Annotated tag "${name}" placed on ${id}. Annotated tags store who/when/why — best for releases.`:`Lightweight tag "${name}" placed on ${id}: just a name stuck to a commit. Add -a -m "…" for a full release note.`;X.hood='Tags live in refs/tags/. Unlike branches, they never move on their own.';};
GIT.remote=(r,a,X)=>{const{pos,f}=parseArgs(a);const sub=pos[0];
 if(!sub){if(r.remote){if(has(f,'-v')){X.P(`${r.remote.name}\t${r.remote.url} (fetch)`);X.P(`${r.remote.name}\t${r.remote.url} (push)`);}else X.P(r.remote.name);X.why='Your remotes: nicknames for other copies of this repo (usually on GitHub).';}else X.why='No remotes yet — this repo lives only on your machine. Add one with git remote add origin <url>.';return;}
 if(sub==='add'){const[,n,u]=pos;if(!n||!u){fail(X,'usage: git remote add <name> <url>');return;}if(r.remote){fail(X,n===r.remote.name?`error: remote ${n} already exists.`:'error: the garden supports one remote (origin) at a time.');return;}
  r.remote={name:n,url:u,branches:{},tags:{}};X.why=`Saved! "${n}" is now a nickname for ${u}. Nothing was uploaded yet — that is what git push does.`;X.hood='Added a [remote "'+n+'"] section to .git/config with the URL.';return;}
 if(sub==='remove'||sub==='rm'){if(!r.remote){fail(X,`error: No such remote: '${pos[1]}'`);return;}r.tracking={};r.upstream={};r.remote=null;X.why='Disconnected from the remote (the online copy is untouched).';return;}
 if(sub==='set-url'){if(r.remote)r.remote.url=pos[2];return;}
 if(sub==='show'||sub==='get-url'){if(!r.remote){fail(X,'fatal: no such remote');return;}X.P(sub==='get-url'?r.remote.url:`* remote ${r.remote.name}\n  Fetch URL: ${r.remote.url}`);return;}
 fail(X,`error: Unknown subcommand: ${sub}`);};
function doFetch(r,X){const rem=r.remote;const out=[];let changed=false;
 for(const[b,id]of Object.entries(rem.branches)){const key=rem.name+'/'+b,old=r.tracking[key];if(old===id)continue;out.push(old?`   ${old}..${id}  ${b.padEnd(8)} -> ${key}`:` * [new branch]      ${b} -> ${key}`);r.tracking[key]=id;changed=true;}
 if(changed){X.P('remote: Enumerating objects, done.');X.P(`From ${rem.url}`);out.forEach(l=>X.P(l));}return changed;}
GIT.fetch=(r,a,X)=>{if(!r.remote){fail(X,"fatal: No remote repository specified.\nPlease, specify either a URL or a remote name from which new revisions should be fetched.",'Add a remote first: git remote add origin <url>');return;}
 const ch=doFetch(r,X);X.why=ch?'Fetched! Git downloaded the new commits and moved your origin/… bookmarks, but did NOT touch your own branches or files. Inspect with git log origin/main, then merge when ready.':'Already up to date — the remote has nothing new.';X.hood='Fetch updates remote-tracking refs (refs/remotes/origin/*). It is the safe half of git pull.';};
GIT.pull=(r,a,X)=>{const{pos,f}=parseArgs(a);if(!r.remote){fail(X,'fatal: No remote repository specified.','Add a remote first: git remote add origin <url>');return;}
 const bn=curName(r);if(!bn){fail(X,'You are not currently on a branch.');return;}
 const up=pos.length>=2?`${pos[0]}/${pos[1]}`:r.upstream[bn];
 if(!up){fail(X,`There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\n\n    git branch --set-upstream-to=${r.remote.name}/<branch> ${bn}`,'Git does not know which remote branch to pull. Link them with git push -u origin <branch> once.');return;}
 doFetch(r,X);const tid=r.tracking[up];if(!tid){fail(X,`fatal: couldn't find remote ref ${up.split('/').slice(1).join('/')}`);return;}
 if(!headId(r)){r.branches[bn]=tid;const t=treeOf(r,tid);setTrees(r,t,t);r.reflog.unshift({id:tid,why:'pull: initial'});X.P('Fast-forward');return;}
 const name=up.split('/').slice(1).join('/');
 if(has(f,'--rebase','-r')){doRebase(r,X,tid,up);if(!X.why)X.why='Pulled with rebase.';}else doMerge(r,X,tid,up,{msg:`Merge branch '${name}' of ${r.remote.url}`});
 if(X.why&&!/^Already/.test(X.why))X.why='git pull = git fetch + git merge. '+X.why;};
GIT.push=(r,a,X)=>{const{pos,f}=parseArgs(a);
 if(!r.remote){fail(X,'fatal: No configured push destination.\nEither specify the URL from the command-line or configure a remote repository using\n\n    git remote add <name> <url>\n\nand then push using the remote name\n\n    git push <name>','There is no cloud yet! Connect one with git remote add origin <url>.');return;}
 const rem=r.remote;const rn=pos[0]||rem.name;if(rn!==rem.name){fail(X,`fatal: '${rn}' does not appear to be a git repository`,'Remote names are nicknames — yours is "'+rem.name+'".');return;}
 if(has(f,'--tags')){const nw=Object.keys(r.tags).filter(t=>rem.tags[t]!==r.tags[t]);X.P(`To ${rem.url}`);nw.forEach(t=>{rem.tags[t]=r.tags[t];X.P(` * [new tag]         ${t} -> ${t}`);});if(!nw.length)X.P('Everything up-to-date');X.why='Tags are not pushed by default — --tags sends them all.';return;}
 const bn0=curName(r);let bn=pos[1];
 if(has(f,'--delete','-d')){const b=pos[1];if(!rem.branches[b]){fail(X,`error: unable to delete '${b}': remote ref does not exist`);return;}delete rem.branches[b];delete r.tracking[`${rn}/${b}`];X.P(`To ${rem.url}`);X.P(` - [deleted]         ${b}`);X.why='Deleted that branch on the remote.';return;}
 if(!bn){if(!bn0){fail(X,'fatal: You are not currently on a branch.');return;}
  if(!pos.length&&!r.upstream[bn0]&&!has(f,'-u','--set-upstream')){fail(X,`fatal: The current branch ${bn0} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream ${rem.name} ${bn0}\n`,`Git doesn't know where "${bn0}" should go online yet. Run it once with -u to link them: git push -u ${rem.name} ${bn0}`);return;}
  bn=(pos.length||!r.upstream[bn0])?bn0:r.upstream[bn0].split('/').slice(1).join('/');if(!r.branches[bn])bn=bn0;}
 const id=r.branches[bn];if(!id){fail(X,`error: src refspec ${bn} does not match any`,'You need a commit on that branch first.');return;}
 const old=rem.branches[bn];const setUp=has(f,'-u','--set-upstream');
 if(old===id){X.P('Everything up-to-date');if(setUp){r.upstream[bn]=`${rn}/${bn}`;X.P(`branch '${bn}' set up to track '${rn}/${bn}'.`);}X.why='The remote already has everything — nothing to send.';return;}
 const force=has(f,'-f','--force','--force-with-lease');
 if(old&&!isAnc(r,old,id)&&!force){X.P(`To ${rem.url}`);X.S([` ! [rejected]        ${bn} -> ${bn} (${r.tracking[rn+'/'+bn]===old?'non-fast-forward':'fetch first'})`,'r']);X.P(`error: failed to push some refs to '${rem.url}'`,'r');
  ['hint: Updates were rejected because the remote contains work that you do','hint: not have locally. This is usually caused by another repository pushing','hint: to the same ref. You may want to first integrate the remote changes','hint: (e.g., \'git pull ...\') before pushing again.'].forEach(l=>X.P(l,'y'));X.ok=false;
  X.why='Rejected! Someone else pushed to this branch while you were working, so the remote has commits you don\'t. Git won\'t let you overwrite their work. Fix: git pull (to bring their commits in and merge), then git push again.';X.hood='A push is only allowed if it is a "fast-forward": the remote tip must be an ancestor of what you send.';return;}
 const n=old?countRange(r,old,id):ancestors(r,id).size;X.P(`Enumerating objects: ${n*3}, done.`);X.P(`Writing objects: 100% (${n*2}/${n*2}), done.`);X.P(`To ${rem.url}`);
 X.P(old?`   ${old}..${id}  ${bn} -> ${bn}${force&&!isAnc(r,old,id)?' (forced update)':''}`:` * [new branch]      ${bn} -> ${bn}`);
 rem.branches[bn]=id;r.tracking[`${rn}/${bn}`]=id;if(setUp){r.upstream[bn]=`${rn}/${bn}`;X.P(`branch '${bn}' set up to track '${rn}/${bn}'.`);}
 X.why=`Uploaded! The remote's "${bn}" now points at ${id}, so your teammates can see ${plural(n,'new commit')}.${setUp?' The -u linked your local branch to it, so from now on plain git push / git pull just work.':''}`;X.hood='Push sends the missing objects to the remote, then moves the remote branch label forward.';};
GIT.clone=(r,a,X)=>{const{pos}=parseArgs(a,['-b','--branch']);const url=pos[0];if(!url){fail(X,'fatal: You must specify a repository to clone.');return;}
 const name=pos[1]||url.split('/').pop().replace(/\.git$/,'')||'garden';const cfg=r.config;resetRepo(r);r.config=cfg;r.inited=true;
 X.P(`Cloning into '${name}'...`);X.P('remote: Enumerating objects: 9, done.');X.P('remote: Total 9 (delta 0), reused 0 (delta 0)');X.P('Receiving objects: 100% (9/9), done.');
 const steps=[['Plant the first seed',{'README.md':'# Gitty garden\nA friendly place to grow things.'}],['Add watering schedule',{'water.txt':'Mon: roses\nWed: ferns'}],['Add garden map',{'map.txt':'front yard\nback yard'}]];
 let tree={},prev=null;steps.forEach(([m,add])=>{tree={...tree,...add};prev=mkCommit(r,m,tree,prev?[prev]:[],'Gitty');});
 r.branches.main=prev;r.head={branch:'main'};r.work={...tree};r.index={...tree};r.remote={name:'origin',url,branches:{main:prev},tags:{}};r.tracking['origin/main']=prev;r.upstream.main='origin/main';r.reflog=[{id:prev,why:'clone: from '+url}];
 X.why='Cloned! Git downloaded the ENTIRE history (every commit) plus a working copy, set up "origin" pointing at the URL, and linked your local main to origin/main. You can work offline from now on.';X.hood='clone = init + remote add origin + fetch + checkout main.';};
GIT.rm=(r,a,X)=>{const{pos,f}=parseArgs(a);if(!pos.length){fail(X,'fatal: No pathspec was given. Which files should I remove?');return;}
 for(const spec of pos){const hits=Object.keys(r.index).filter(x=>matchSpec(spec,x));if(!hits.length){fail(X,`fatal: pathspec '${spec}' did not match any files`);return;}
  for(const h of hits){if(!has(f,'--cached','-f')&&r.work[h]!==undefined&&r.work[h]!==r.index[h]){fail(X,`error: the following file has local modifications:\n    ${h}\n(use --cached to keep the file, or -f to force removal)`);return;}
   delete r.index[h];if(!has(f,'--cached'))delete r.work[h];X.P(`rm '${h}'`);}}
 X.why=has(f,'--cached')?'Git stopped tracking the file but left it on disk (great for files you meant to ignore). The deletion is staged — commit it.':'The file was deleted from disk AND the deletion is staged. Commit to make it permanent in history.';};
GIT.mv=(r,a,X)=>{const{pos}=parseArgs(a);if(pos.length<2){fail(X,'usage: git mv <source> <destination>');return;}const[s,d]=pos;
 if(r.index[s]===undefined){fail(X,`fatal: not under version control, source=${s}, destination=${d}`);return;}
 r.index[d]=r.index[s];delete r.index[s];if(r.work[s]!==undefined){r.work[d]=r.work[s];delete r.work[s];}X.why=`Renamed ${s} → ${d} and staged it. Git doesn't store renames explicitly; it notices that the content matches and shows "renamed".`;};
GIT.clean=(r,a,X)=>{const{f}=parseArgs(a);const dry=has(f,'-n','--dry-run'),force=has(f,'-f','--force'),dirs=has(f,'-d');
 if(!dry&&!force){fail(X,'fatal: clean.requireForce defaults to true and neither -i, -n, nor -f given; refusing to clean','git clean DELETES untracked files for good, so Git makes you say so: -n to preview, -f to do it.');return;}
 const list=changes(r).untracked.filter(x=>dirs||!x.includes('/'));if(!list.length)X.why='Nothing untracked to clean.';
 list.forEach(x=>{if(dry)X.P(`Would remove ${x}`);else{delete r.work[x];X.P(`Removing ${x}`);}});
 if(list.length)X.why=dry?'Dry run — nothing was deleted. Run again with -f to really remove these.':'Deleted! Untracked files are NOT in any commit, so there is no way to get them back.';};
GIT.blame=(r,a,X)=>{const{pos}=parseArgs(a);const fn=pos[0];const t=headTree(r);if(!fn||t[fn]===undefined){fail(X,`fatal: no such path ${fn||''} in HEAD`);return;}
 const chain=[];let c=headId(r);while(c){chain.unshift(c);c=r.commits[c].parents[0];}
 lines(t[fn]).forEach((line,i)=>{let who=null;for(let k=chain.length-1;k>=0;k--){const tr=r.commits[chain[k]].tree[fn];if(tr!==undefined&&lines(tr).includes(line))who=chain[k];else break;}
  const cm=r.commits[who||headId(r)];X.S([cm.id,'y'],` (${cm.author.padEnd(7)} ${isoDate(cm.seq)} ${i+1}) ${line}`);});
 X.why='blame shows, for every line, the commit (and person) that last changed it. Perfect for answering "why is it like this?".';};
GIT.reflog=(r,a,X)=>{if(!r.reflog.length)X.P('(no history yet)','dim');r.reflog.forEach((e,i)=>X.S([e.id,'y'],` HEAD@{${i}}: ${e.why}`));
 X.why='The reflog is Git\'s private diary of everywhere HEAD has been — even commits no branch points to anymore. It is your undo button for disasters like a bad reset --hard. Find the ID, then git reset --hard <id> or git branch rescue <id>.';};
GIT.bisect=(r,a,X)=>{const sub=a[0];const chainOf=id=>{const c=[];let x=id;while(x){c.push(x);x=r.commits[x].parents[0];}return c;};
 if(sub==='start'){r.bisect={orig:{...r.head},good:null,bad:null,found:null};X.P('status: waiting for both good and bad commits');X.why='Bisect mode on! Tell Git one commit where things worked (good) and one where they are broken (bad). It will then binary-search the history for you.';return;}
 if(!r.bisect){fail(X,'You need to start by "git bisect start"','Begin with git bisect start.');return;}
 if(sub==='reset'){const o=r.bisect.orig;if(o.branch&&r.branches[o.branch]){const t=treeOf(r,r.branches[o.branch]);switchTrees(r,t);r.head={branch:o.branch};}r.bisect=null;X.P('Previous HEAD position was restored.');X.why='Bisect finished — you are back on your branch.';return;}
 if(sub==='good'||sub==='bad'||sub==='new'||sub==='old'){const sp=a[1];const id=sp?resolveRev(r,sp):headId(r);if(!id){fail(X,`error: Bad rev input: ${sp}`);return;}
  const isBad=sub==='bad'||sub==='new';if(isBad)r.bisect.bad=id;else r.bisect.good=id;const b=r.bisect;
  if(!b.good||!b.bad){X.P(`status: waiting for ${b.good?'a bad':'a good'} commit`);X.why=`Marked ${id} as ${isBad?'bad':'good'}. Now mark a ${isBad?'good':'bad'} one.`;return;}
  const chain=chainOf(b.bad);const gi=chain.indexOf(b.good);if(gi<0){fail(X,'error: the good commit must be an ancestor of the bad one.');return;}
  const cands=chain.slice(0,gi).reverse();
  if(cands.length===1){b.found=cands[0];r.flags.bisectFoundMsg=r.commits[cands[0]].msg;X.S([`${cands[0]} is the first bad commit`,'g']);const c=r.commits[cands[0]];X.P(`commit ${full(c.id)}`);X.P(`Author: ${c.author} <${emailOf(c.author)}>`);X.P('');X.P('    '+c.msg);
   X.why=`Found the culprit: "${c.msg}"! Bisect halves the search each time, so even 1,000 commits take only ~10 checks. Finish with git bisect reset.`;return;}
  const mid=cands[Math.floor((cands.length-1)/2)];switchTrees(r,treeOf(r,mid));r.head={id:mid};
  X.P(`Bisecting: ${cands.length-1} revisions left to test after this (roughly ${Math.ceil(Math.log2(cands.length))} steps)`);X.P(`[${mid}] ${r.commits[mid].msg}`);
  X.why=`Git jumped to a commit in the middle of the suspects. Check whether the bug is present here (try cat on the file), then tell Git: git bisect good — or — git bisect bad.`;return;}
 fail(X,`error: unknown bisect command '${sub}'`);};
GIT.grep=(r,a,X)=>{const{pos}=parseArgs(a);if(!pos[0]){fail(X,'fatal: no pattern given');return;}let n=0;
 Object.keys(r.index).sort().forEach(f=>{if(r.work[f]===undefined)return;lines(r.work[f]).forEach((l,i)=>{if(l.toLowerCase().includes(pos[0].toLowerCase())){n++;X.S([f,'m'],':',[String(i+1),'g'],':'+l);}});});
 X.why=n?`Found ${n} matching line(s) across tracked files.`:'No matches in tracked files.';};
GIT['ls-files']=(r,a,X)=>{Object.keys(r.index).sort().forEach(f=>X.P(f));X.why='ls-files lists everything in the staging area (index) — i.e. every file Git is tracking.';};
GIT['rev-parse']=(r,a,X)=>{const{pos,f}=parseArgs(a);const id=resolveRev(r,pos[pos.length-1]||'HEAD');if(!id){fail(X,`fatal: ambiguous argument '${pos[0]}': unknown revision`);return;}X.P(has(f,'--short')?id:full(id));X.why='rev-parse turns a name (HEAD, main, HEAD~2) into the commit\'s real hash.';};
GIT['cat-file']=(r,a,X)=>{const{pos,f}=parseArgs(a);const id=resolveRev(r,pos[0]);if(!id){fail(X,`fatal: Not a valid object name ${pos[0]}`);return;}const c=r.commits[id];
 if(has(f,'-t')){X.P('commit');return;}X.P('tree '+full(sha(JSON.stringify(c.tree))));c.parents.forEach(p=>X.P('parent '+full(p)));X.P(`author ${c.author} <${emailOf(c.author)}> ${1790000000+c.seq*2820} +0000`);X.P(`committer ${c.author} <${emailOf(c.author)}> ${1790000000+c.seq*2820} +0000`);X.P('');X.P(c.msg);
 X.why='This is what a commit REALLY is: a tiny text object with a pointer to a snapshot (tree), pointers to parent commit(s), author info and a message. Everything in Git is built from objects like this.';};
GIT.help=(r,a,X)=>{const c=a[0];const e=c&&(typeof REFMAP!=='undefined')&&REFMAP[c];
 if(e){X.P(`git ${c} — ${e.d}`,'bold');X.P('');X.P('  example:  '+e.ex);(e.f||[]).forEach(([k,v])=>X.P(`  ${k.padEnd(16)} ${v}`));X.why='This is the garden version of the manual. Open the Command book tab for every command with explanations.';return;}
 X.P('Common git commands (see the Command book for everything):','bold');
 [['start','init clone config'],['snapshot','status add commit restore rm mv stash clean'],['branch','branch switch checkout merge rebase cherry-pick tag'],['share','remote fetch pull push'],['inspect','log show diff blame grep reflog bisect'],['undo','reset revert restore']].forEach(([k,v])=>X.S([k.padEnd(10),'y'],v));
 X.P('');X.P('Try: git help <command>','dim');};
GIT.version=(r,a,X)=>X.P('git version 2.47.0 (garden edition 🌱)');GIT['--version']=GIT.version;

/* ================= shell helpers ================= */
const SH={};const PHRASES=['water the roses','plant tulips','add sunflowers','trim the hedge','feed the bees','buy new seeds','compost the leaves','paint the fence'];
SH.ls=(r,a,X)=>{const all=a.includes('-a');const fs=Object.keys(r.work).filter(f=>all||!f.startsWith('.')).sort();if(!fs.length){X.P('(empty folder — try: touch hello.txt)','dim');return;}
 X.S(...uniq(fs.map(f=>f.includes('/')?f.split('/')[0]+'/':f)).flatMap(f=>[[f+'  ',f.endsWith('/')?'b':'']]));X.why='ls lists the files in your working folder (add -a to see hidden ones like .gitignore).';};
SH.cat=(r,a,X)=>{if(!a.length){fail(X,'cat: missing file name');return;}a.forEach(f=>{if(r.work[f]===undefined)fail(X,`cat: ${f}: No such file or directory`);else lines(r.work[f]).forEach(l=>X.P(l,/^(<<<<<<<|=======|>>>>>>>)/.test(l)?'m':''));});X.why='cat prints a file\'s contents.';};
SH.touch=(r,a,X)=>{if(!a.length){fail(X,'touch: missing file name');return;}a.forEach(f=>{if(r.work[f]===undefined)r.work[f]='';});X.why=`Created ${a.join(', ')}. Git hasn't noticed yet — new files start out "untracked" until you git add them.`;};
SH.echo=(r,a,X,t)=>{const k=t.findIndex((x,i)=>i>0&&!t.q[i]&&(x==='>'||x==='>>'));
 if(k<0){X.P(a.join(' '));return;}const op=t[k],file=t[k+1];const text=t.slice(1,k).join(' ');if(!file){fail(X,'echo: missing file after '+op);return;}
 if(op==='>>'&&r.work[file]!==undefined&&r.work[file]!=='')r.work[file]+='\n'+text;else r.work[file]=text;
 X.why=`Wrote "${text}" ${op==='>>'?'to the end of':'into'} ${file}. If Git tracks that file, it will now show as modified.`;};
SH.edit=(r,a,X)=>{const f=a[0];if(!f){fail(X,'edit: which file? e.g. edit notes.txt');return;}const old=r.work[f];
 if(old!==undefined&&/^<<<<<<< /m.test(old)){r.work[f]=old.split('\n').filter(l=>!/^(<<<<<<<|=======|>>>>>>>)/.test(l)).join('\n');X.P(`(opened ${f} in your editor, removed the conflict markers, kept both sides ✨)`,'dim');X.why='You resolved the conflict by hand: deleted the <<<<<<< ======= >>>>>>> lines and kept what you want. Next: git add the file, then git commit.';return;}
 const text=a.slice(1).join(' ')||PHRASES[lines(old).length%PHRASES.length];r.work[f]=old?old+'\n'+text:text;
 X.P(`(edited ${f}: added "${text}")`,'dim');X.why=`Added a line to ${f}. If Git tracks it, git status now shows it as modified.`;};
SH.rm=(r,a,X)=>{const{pos}=parseArgs(a);if(!pos.length){fail(X,'rm: missing operand');return;}pos.forEach(p=>{const h=Object.keys(r.work).filter(x=>matchSpec(p,x));if(!h.length)fail(X,`rm: cannot remove '${p}': No such file or directory`);h.forEach(x=>delete r.work[x]);});X.why='Deleted from your folder only. If Git tracks the file, status shows it as "deleted" — you can bring it back with git restore, or stage the deletion with git add.';};
SH.pwd=(r,a,X)=>X.P('/home/you/garden');SH.mkdir=(r,a,X)=>{X.P('(folders appear automatically when you create files like src/app.js)','dim');};SH.cd=(r,a,X)=>X.P('(the garden is a single folder 🌱)','dim');
SH.clear=(r,a,X)=>{X.clear=true;};
SH.help=(r,a,X)=>{X.P('🌱 Garden cheat sheet','bold');X.P('  git <command>        any git command (try: git help)');X.P('  ls  cat <f>  touch <f>  rm <f>');X.P('  echo "text" >> <f>   add a line to a file');X.P('  edit <f> [text]      pretend-editor: adds a line (or fixes conflict markers)');X.P('  teammate             a teammate pushes a commit to the remote');X.P('  clear                tidy the screen');};
SH.teammate=(r,a,X)=>{if(!r.remote){fail(X,'No cloud to push to yet! Add a remote first: git remote add origin <url>','Your teammate needs a shared remote. Try git clone <url> or git remote add origin <url>.');return;}
 const bn='main';const tip=r.remote.branches[bn];const tree={...treeOf(r,tip)};const n=++r.tm;tree[`teammate-${n}.txt`]=`hello from your teammate (#${n})`;
 const id=mkCommit(r,`Teammate adds notes ${n}`,tree,tip?[tip]:[],'Teammate');r.remote.branches[bn]=id;
 X.P(`📬 Your teammate pushed "Teammate adds notes ${n}" to ${r.remote.name}/${bn}.`,'m');X.P('Your computer doesn\'t know yet… try git fetch!','dim');X.why='Playground magic: a teammate just uploaded a commit. The remote moved ahead of your local copy — see how git fetch / pull deal with it.';};

const CONCEPT_ONLY=new Set(['submodule','worktree','gc','fsck','archive','format-patch','am','shortlog','describe','notes']);
function runGit(r,argv,X){const sub=argv[0];
 if(!sub){GIT.help(r,[],X);return;}
 if(sub==='--help'||sub==='-h'){GIT.help(r,[],X);return;}
 if(CONCEPT_ONLY.has(sub)){const e=REFMAP[sub];X.P(`💡 git ${sub} — ${e.d}`,'y');X.P('   example: '+e.ex,'dim');X.P('   (concept-only in the garden: read it in the Command book)','dim');X.why=e.d;return;}
 const h=GIT[sub];if(!h){const near=Object.keys(GIT).filter(k=>k.startsWith(sub.slice(0,2)));fail(X,`git: '${sub}' is not a git command. See 'git --help'.`+(near.length?`\n\nThe most similar commands are\n        ${near.slice(0,3).join('\n        ')}`:''),"That subcommand doesn't exist — check spelling, or type git help.");return;}
 if(!['init','clone','config','help','version','--version'].includes(sub)&&!r.inited){fail(X,'fatal: not a git repository (or any of the parent directories): .git','Git commands only work inside a repository. Create one with git init (or git clone <url>).');return;}
 h(r,argv.slice(1),X);}
function runLine(r,line){const X=mkX();const t=tokenize(line.trim());if(!t.length)return X;const c=t[0];
 if(c==='git')runGit(r,t.slice(1),X);else if(SH[c])SH[c](r,t.slice(1),X,t);
 else fail(X,`${c}: command not found`,'Try a git command (they start with "git") or a helper: ls, cat, touch, echo, edit, teammate. Type help for the full list.');
 return X;}
