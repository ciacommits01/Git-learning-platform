/* ================= UI ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const pick=a=>a[Math.floor(Math.random()*a.length)];
const KEY='gitgarden.v1';
function loadProg(){try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&typeof j==='object')return{xp:+j.xp||0,done:j.done||{},quiz:j.quiz||{}};}catch(e){}return{xp:0,done:{},quiz:{}};}
let P=loadProg();
function saveProg(){try{localStorage.setItem(KEY,JSON.stringify(P));}catch(e){}}
const LV=['Seedling','Sprout','Sapling','Branch Buddy','Merge Master','Rebase Ranger','Git Wizard'],PER=140;
const lvlOf=xp=>Math.floor(xp/PER);
const S={view:'map',mode:'sandbox',repo:newRepo(),quest:null,h:[],hist:[],hi:0,hintIdx:0,completed:false,prevGoals:[],sayT:null,bookTab:'cmds',bookCat:'All',bookQ:'',quiz:null,labReady:false};

/* ---------- Gitty the mascot ---------- */
function gitty(mood='happy'){
 const ink='#2b2250';
 const eyes={cheer:`<path d="M36 68 Q43 57 50 68" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/><path d="M70 68 Q77 57 84 68" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`,
  oops:`<ellipse cx="44" cy="66" rx="7" ry="9" fill="${ink}"/><ellipse cx="76" cy="66" rx="7" ry="9" fill="${ink}"/><circle cx="46" cy="63" r="3" fill="#fff"/><circle cx="78" cy="63" r="3" fill="#fff"/>`,
  think:`<ellipse cx="44" cy="66" rx="6" ry="8" fill="${ink}"/><ellipse cx="76" cy="66" rx="6" ry="8" fill="${ink}"/><circle cx="47" cy="62" r="2.4" fill="#fff"/><circle cx="79" cy="62" r="2.4" fill="#fff"/><path d="M68 52 L84 48" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`}[mood]||
  `<ellipse cx="44" cy="66" rx="6" ry="8" fill="${ink}"/><ellipse cx="76" cy="66" rx="6" ry="8" fill="${ink}"/><circle cx="46" cy="63" r="2.2" fill="#fff"/><circle cx="78" cy="63" r="2.2" fill="#fff"/>`;
 const mouth={cheer:`<path d="M48 78 Q60 98 72 78Z" fill="${ink}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="60" cy="87" rx="6" ry="3.6" fill="#ff7aa8"/>`,
  oops:`<path d="M50 85 Q55 79 60 85 T70 85" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/><path d="M99 34 Q106 45 99 50 Q92 45 99 34Z" fill="#69b7ff" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>`,
  think:`<circle cx="62" cy="83" r="3.6" fill="${ink}"/>`}[mood]||`<path d="M52 80 Q60 89 68 80" fill="none" stroke="${ink}" stroke-width="3.8" stroke-linecap="round"/>`;
 return `<svg viewBox="0 0 120 124" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gitty the sprout mascot"><ellipse cx="60" cy="116" rx="34" ry="6" fill="${ink}" opacity=".18"/>
 <path d="M60 22 C92 22 106 48 104 76 C102 100 84 110 60 110 C36 110 18 100 16 76 C14 48 28 22 60 22Z" fill="#4fd1a8" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>
 <path d="M60 22 L60 11" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>
 <path d="M60 15 C50 2 35 6 37 19 C48 22 56 20 60 15Z" fill="#7be08f" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>
 <path d="M60 15 C70 2 85 6 83 19 C72 22 64 20 60 15Z" fill="#7be08f" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>
 <ellipse cx="31" cy="82" rx="8" ry="5" fill="#ff7aa8" opacity=".75"/><ellipse cx="89" cy="82" rx="8" ry="5" fill="#ff7aa8" opacity=".75"/>${eyes}${mouth}</svg>`;}
function say(text,mood='happy',sticky){const g=$('#gitty');if(g)g.innerHTML=gitty(mood);const b=$('#bubble');if(b)b.innerHTML=text;clearTimeout(S.sayT);if(!sticky)S.sayT=setTimeout(sayBase,7000);}
function sayBase(){if(S.mode==='quest'&&S.quest)say(esc(S.quest.story),'happy',true);else say('Welcome to the sandbox! 🧪 Nothing here can break. Type <b>help</b> for a cheat sheet, or tap a chip under the terminal.','happy',true);}

/* ---------- progress / header ---------- */
function updateHeader(){const l=lvlOf(P.xp);$('#lvl').textContent=`Lv ${l+1} · ${LV[Math.min(l,LV.length-1)]}`;$('#xpfill').style.width=((P.xp%PER)/PER*100)+'%';$('#xptxt').textContent=P.xp+' XP';}
function addXP(n){const before=lvlOf(P.xp);P.xp+=n;saveProg();updateHeader();if(lvlOf(P.xp)>before)toast(`🎉 Level up! You are now a ${LV[Math.min(lvlOf(P.xp),LV.length-1)]}`);}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),3200);}
function confetti(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const c=$('#confetti'),cols=['#4fd1a8','#ff7aa8','#ffd25e','#69b7ff','#b9a4ff','#ff9f7a'];
 for(let i=0;i<46;i++){const e=document.createElement('i');e.style.left=Math.random()*100+'%';e.style.background=pick(cols);e.style.animationDelay=Math.random()*.6+'s';e.style.animationDuration=(1.8+Math.random()*1.4)+'s';c.appendChild(e);}
 setTimeout(()=>{c.innerHTML='';},3600);}

/* ---------- views ---------- */
function setView(v){S.view=v;['map','lab','book','quiz'].forEach(x=>{$('#v-'+x).hidden=x!==v;});
 const nav=v==='lab'?(S.mode==='sandbox'?'sandbox':'map'):v==='quiz'?'map':v;
 document.querySelectorAll('#nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.view===nav?'page':'false'));window.scrollTo(0,0);}
function go(v){if(v==='map'){renderMap();setView('map');}else if(v==='sandbox'){startSandbox(false);}else if(v==='book'){renderBook();setView('book');}}

/* ---------- quest map ---------- */
function stars(n){return '★'.repeat(n)+'☆'.repeat(3-n);}
function renderMap(){
 const doneN=QUESTS.filter(q=>P.done[q.id]).length;
 const greet=doneN===0?`Hi, I'm <b>Gitty</b>! 🌱 I live inside the hidden <code>.git</code> folder. Pick a quest and type <b>real Git commands</b> — I'll explain every word while you type, and show what happens to your files and history.`:
  doneN===QUESTS.length?`You cleared <b>every quest</b>! 🏆 You're a Git Wizard. Head to the Sandbox and show off.`:`${doneN} of ${QUESTS.length} quests done. Keep growing! Try a boss quiz at the end of a world for bonus XP.`;
 let h=`<div class="hello"><div class="bob">${gitty(doneN===QUESTS.length?'cheer':'happy')}</div><div class="bubble"><p>${greet}</p><p><button class="btn sm sky" data-go="sandbox">Open the Sandbox</button> <button class="btn sm ghost" data-go="book">Browse the command book</button></p></div></div>`;
 h+=`<h3 style="margin:0 0 8px">Sticker book</h3><div class="stickers">${QUESTS.map(q=>`<div class="stk ${P.done[q.id]?'on':''}" title="${esc(q.t)}">${q.e}</div>`).join('')}</div>`;
 WORLDS.forEach(w=>{const qs=QUESTS.filter(q=>q.w===w.id),dn=qs.filter(q=>P.done[q.id]).length;
  h+=`<div class="world"><header style="background:${w.col}"><span class="em">${w.e}</span><div><h2>${w.n}</h2><p>${w.s}</p></div><span class="prog">${dn}/${qs.length}</span></header><div class="qgrid">`;
  qs.forEach(q=>{const st=P.done[q.id];h+=`<button class="qn ${st?'done':''}" data-q="${q.id}"><span class="em">${q.e}</span><span>${esc(q.t)}<span class="st">${st?stars(st):q.xp+' XP'}</span></span></button>`;});
  const sc=P.quiz[w.id];h+=`<button class="qn boss ${sc!==undefined?'done':''}" data-quiz="${w.id}"><span class="em">👑</span><span>Boss quiz<span class="st">${sc!==undefined?`best ${sc}/3`:'3 questions · bonus XP'}</span></span></button></div></div>`;});
 h+=`<p style="text-align:center"><button class="btn sm ghost" id="resetProg">Reset my progress</button></p>`;
 $('#v-map').innerHTML=h;}

/* ---------- lab ---------- */
let prevKeys=new Set();
function resetLab(){S.repo=newRepo();S.h=[];S.hintIdx=0;S.completed=false;S.prevGoals=[];prevKeys=new Set();$('#tout').innerHTML='';$('#cmd').value='';}
function runSilent(cmds){cmds.forEach(c=>runLine(S.repo,c));S.repo.flags={};}
function startQuest(id){const q=QUESTS.find(x=>x.id===id);S.mode='quest';S.quest=q;resetLab();runSilent(q.setup);
 intro(`🌱 Quest: ${q.t}. Type a command and press Enter.  (Tab completes · ↑ recalls)`);
 renderQuestCard();renderAll();sayBase();setView('lab');S.labReady=true;checkGoals(true);$('#cmd').focus({preventScroll:true});}
function startSandbox(reset){if(S.mode!=='sandbox'||reset||!S.labReady){S.mode='sandbox';S.quest=null;resetLab();intro('🧪 Sandbox: an empty folder. Try:  touch hello.txt  →  git init  →  git status');S.labReady=true;}
 renderSandboxCard();renderAll();sayBase();setView('lab');}
function intro(t){printLines([[[t,'dim']]]);}
function renderSandboxCard(){$('#qcard').innerHTML=`<h3>🧪 Sandbox</h3><p style="margin:4px 0 10px;font-weight:600">Free play. Every command really changes the pretend repo, and the pictures update live.</p>
 <div class="row"><button class="btn sm mint" data-act="sample">Load sample project</button><button class="btn sm pink" data-act="blank">Empty folder</button><button class="btn sm sky" data-act="mate">📬 Teammate pushes</button></div>
 <h4 style="margin:14px 0 6px;font-size:.95rem">Ideas to try</h4><div class="row">${['touch a.txt','git init','git add .','git commit -m "first"','git switch -c idea','git log --oneline --all','git reflog'].map(c=>`<button class="btn sm ghost mono" data-ins="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;}
function renderQuestCard(){const q=S.quest,w=WORLDS.find(x=>x.id===q.w);
 $('#qcard').innerHTML=`<span class="pill" style="background:${w.col};color:#2b2250">${w.e} ${w.n}</span><h3 style="margin-top:6px">${q.e} ${esc(q.t)}</h3><ul class="goals" id="goals"></ul>
 <div class="row"><button class="btn sm" data-act="hint">💡 Hint</button><button class="btn sm ghost" data-act="restart">↻ Restart</button><button class="btn sm ghost" data-act="map">Quest map</button></div><div id="hintBox"></div>`;
 renderGoals(q.goals.map(()=>false));}
function renderGoals(res){const q=S.quest;if(!q)return;const ul=$('#goals');if(!ul)return;ul.innerHTML=q.goals.map((g,i)=>`<li class="${res[i]?'ok':''}"><span class="ck">${res[i]?'✓':''}</span><span>${esc(g.t)}</span></li>`).join('');}
function checkGoals(initial){const q=S.quest;if(!q)return;const res=q.goals.map(g=>{try{return!!g.ok(S.repo,S.h);}catch(e){return false;}});renderGoals(res);
 if(!initial&&res.some((x,i)=>x&&!S.prevGoals[i])&&!res.every(Boolean))say('✔ Goal done! Keep going — you\'re close.','cheer');
 S.prevGoals=res;if(!initial&&S.h.length&&res.every(Boolean)&&!S.completed){S.completed=true;setTimeout(()=>completeQuest(q),650);}}
function showHint(){const q=S.quest;if(!q)return;const i=Math.min(S.hintIdx,q.hints.length-1);S.hintIdx=Math.min(S.hintIdx+1,q.hints.length);
 const txt=esc(q.hints[i]);
 $('#hintBox').innerHTML=`<div class="hint">💡 Hint ${i+1}/${q.hints.length}: ${txt}</div>`;say('Stuck? That\'s normal — hints cost a star, but learning is the point! 🌟','think');}
function completeQuest(q){const st=S.hintIdx===0?3:S.hintIdx===1?2:1;const first=!P.done[q.id];P.done[q.id]=Math.max(P.done[q.id]||0,st);const gain=first?q.xp+5*(st-1):0;saveProg();if(gain)addXP(gain);
 const idx=QUESTS.findIndex(x=>x.id===q.id),next=QUESTS[idx+1];const w=WORLDS.find(x=>x.id===q.w);const worldDone=QUESTS.filter(x=>x.w===q.w).every(x=>P.done[x.id]);
 confetti();say('Quest complete! 🎉','cheer',true);
 showModal(`<div class="bob" style="display:inline-block">${gitty('cheer')}</div><h2 style="margin:6px 0">Quest complete!</h2><div class="stars" aria-label="${st} of 3 stars">${stars(st)}</div>
  <p style="font-weight:800;margin:6px 0">${gain?`+${gain} XP`:'Already cleared — practice makes perfect!'}</p>
  <p style="background:var(--soft);border-radius:14px;padding:10px 12px;font-weight:700;text-align:left">${q.e} <b>What you learned:</b> ${esc(q.learn)}</p>
  ${worldDone?`<p style="font-weight:800">${w.e} ${w.n} cleared! A boss quiz is waiting 👑</p>`:''}
  <div class="row" style="justify-content:center;margin-top:12px">${next?`<button class="btn mint" data-m="next" data-id="${next.id}">Next: ${esc(next.t)}</button>`:''}<button class="btn ghost" data-m="stay">Keep experimenting</button><button class="btn ghost" data-m="map">Quest map</button></div>`);}
function showModal(h){const m=$('#modal');m.innerHTML=`<div class="card">${h}</div>`;m.classList.add('on');}
function closeModal(){$('#modal').classList.remove('on');$('#modal').innerHTML='';}

/* ---------- terminal ---------- */
function printLines(lines){const o=$('#tout');for(const line of lines){const d=document.createElement('div');d.className='ln';for(const[t,c]of line){const s=document.createElement('span');if(c)s.className='c-'+c;s.textContent=t;d.appendChild(s);}o.appendChild(d);}o.scrollTop=o.scrollHeight;}
function promptParts(){const r=S.repo;let b='';if(r.inited){const dirty=r.inited&&(dirtyFiles(r).size||changes(r).untracked.length);b=` (${curName(r)||'detached'}${dirty?'*':''})`;}return['~/garden',b];}
function renderPrompt(){const[a,b]=promptParts();$('#ps').innerHTML=`<span class="prompt-mint">${esc(a)}</span><span class="prompt-pink">${esc(b)}</span> $`;}
function exec(line){line=line.trim();if(!line)return;const[a,b]=promptParts();
 printLines([[[a,'g'],[b,'m'],[' $ ',''],[line,'bold']]]);
 S.hist.push(line);S.hi=S.hist.length;const X=runLine(S.repo,line);
 if(X.clear)$('#tout').innerHTML='';else printLines(X.o);S.h.push(line);
 showLast(X);renderAll();
 if(!X.ok&&line!==''){const w=X.why||'Read the red text — it usually tells you what to do.';say(`Oops! ${esc(w.length>150?w.slice(0,147).replace(/\s\S*$/,'')+'…':w)} 🌸`,'oops');}
 else if(S.mode==='sandbox'&&X.why)say(esc(X.why.split(/(?<=[.!?])\s/)[0]),'happy');
 if(S.mode==='quest')checkGoals();}
function showLast(X){const el=$('#last');el.className='last'+(X.ok?'':' bad');
 el.innerHTML=`<h4>${X.ok?'🎬 What just happened':'🙅 Git said no'}</h4><p>${esc(X.why||'Done.')}</p>${X.hood?`<div class="hood">🔧 Under the hood: ${esc(X.hood)}</div>`:''}`;}
function chipsFor(){return['git status','git add .','git commit -m ""','git log --oneline','git branch','git diff','ls','touch ','edit ','teammate','help'];}
function renderChips(){$('#chips').innerHTML=chipsFor().map(c=>`<button data-ins="${esc(c)}">${esc(c.trim())}</button>`).join('');}
function insert(t){const i=$('#cmd');i.value=t;i.focus();const q=t.indexOf('""');if(q>=0)i.setSelectionRange(q+1,q+1);liveExplain(i.value);}
function complete(){const i=$('#cmd'),v=i.value,r=S.repo,word=(v.match(/(\S*)$/)||['',''])[1],before=v.slice(0,v.length-word.length),t=tokenize(before);let pool;
 if(!t.length)pool=['git',...Object.keys(SH)];else if(t[0]==='git'&&t.length===1)pool=uniq([...Object.keys(GIT).filter(k=>!k.startsWith('-')&&k!=='version'),...REF.map(x=>x.n)]);
 else pool=uniq([...Object.keys(r.branches),...Object.keys(r.tracking),...Object.keys(r.work),...Object.keys(r.tags),...(r.remote?[r.remote.name]:[]),'HEAD']);
 const hits=pool.filter(p=>p.startsWith(word)&&p!==word).sort();if(!hits.length)return;
 if(hits.length===1){i.value=before+hits[0]+' ';}else{let c=hits[0];for(const h of hits)while(!h.startsWith(c))c=c.slice(0,-1);if(c.length>word.length)i.value=before+c;else printLines([[[hits.join('   '),'dim']]]);}
 liveExplain(i.value);}

/* ---------- live explainer ---------- */
const SHD={ls:'list the files in this folder',cat:'print a file\'s contents',touch:'create an empty file',echo:'print text — or write it into a file with > or >>',edit:'pretend-editor: adds a line, or fixes conflict markers',rm:'delete a file from disk',teammate:'a teammate pushes a commit to the remote',clear:'clear the screen',help:'show the cheat sheet',pwd:'print the folder name',mkdir:'(folders appear automatically)',cd:'(the garden is one folder)'};
const GFL={'-m':'message','-a':'all tracked files','-u':'upstream / update','-d':'delete','-D':'force delete','-b':'name of a new branch','-c':'create a new branch','-f':'force','-n':'a number / dry-run','-v':'verbose','-s':'short output','-p':'patch (pick chunks)','--hard':'also overwrite files (destructive!)','--soft':'move the branch only','--mixed':'move branch and clear staging','--staged':'look at / change the staging area','--cached':'the staging area','--oneline':'one compact line per commit','--graph':'draw branch shapes','--all':'all branches / all changes','--amend':'rewrite the last commit','--abort':'cancel the operation','--continue':'carry on after fixing a conflict','--no-ff':'always create a merge commit','--force':'overwrite (dangerous)','--tags':'include tags','--global':'for every repo on this computer','--list':'show a list','--rebase':'replay instead of merging','--detach':'visit a commit without a branch','--stat':'summary only','--name-only':'file names only','--short':'short output','--cached ':''};
function describeTok(t,i,sub){const w=t[i],q=t.q[i],r=S.repo,prev=t[i-1];
 if(i===0){if(w==='git')return['t-git','Every Git command starts with this'];if(SHD[w])return['t-cmd',SHD[w]];const m=['git',...Object.keys(SHD)].filter(x=>x.startsWith(w));return m.length&&w.length<7?['t-arg','keep typing… '+m.slice(0,3).join(', ')]:['t-bad','not a command I know'];}
 if(t[0]!=='git'){if(!q&&(w==='>'||w==='>>'))return['t-flag',w==='>>'?'append to the file':'overwrite the file'];return['t-arg',q?'text':'a file name or value'];}
 if(i===1){const e=REFMAP[w];if(e)return['t-cmd',e.d.split(/(?<=\.)\s/)[0]];const m=Object.keys(REFMAP).filter(x=>x.startsWith(w));return m.length?['t-arg','keep typing… '+m.slice(0,4).join(', ')]:['t-bad','not a git command'];}
 if(!q&&w.startsWith('-')&&w!=='-'){const e=REFMAP[sub];const hit=e&&e.f.find(([k])=>k.split(' ')[0]===w.split('=')[0]);return['t-flag',hit?hit[1]:(GFL[w.split('=')[0]]||'an option that tweaks the command')];}
 if(prev==='-m'||prev==='--message')return['t-arg','the message text'];
 if(['-b','-c','-C','-B'].includes(prev))return['t-arg','name for the new branch'];
 if(w==='.')return['t-arg','everything in this folder'];
 if(r.branches[w])return['t-arg','a branch'];if(r.tracking[w])return['t-arg','a remote branch'];if(r.tags[w])return['t-arg','a tag'];
 if(r.remote&&w===r.remote.name)return['t-arg','the remote'];
 if(r.work[w]!==undefined||r.index[w]!==undefined)return['t-arg','a file'];
 if(r.inited&&resolveRev(r,w))return['t-arg','a commit'];
 if(/^HEAD/.test(w))return['t-arg','where you are now (HEAD~1 = one commit back)'];
 return['t-arg',q?'text':'a name or value'];}
const nmq=a=>a.map(x=>'“'+x+'”').join(', ');
const pushedHead=r=>{const u=curName(r)&&r.upstream[curName(r)],tr=u&&r.tracking[u],h=headId(r);return!!(tr&&h&&isAnc(r,h,tr));};
const LIVE={
 init:()=>['Turns this folder into a Git repository by creating a hidden .git folder — Git\'s memory.',S.repo.inited?'ℹ️ This folder is already a repository.':''],
 clone:p=>['Downloads a complete copy of a remote repository (all commits) and links it as "origin".',p.pos[0]?'':'Add the repository URL.'],
 config:p=>[p.pos.length>=2?`Saves the setting ${p.pos[0]} = “${p.pos.slice(1).join(' ')}”.`:'Reads or writes a setting such as your name or email.',''],
 status:()=>['Shows what changed: green = staged for the next commit, red = changed or new but not staged.',''],
 add:(p,r,f)=>{const ch=changes(r);return[(p.pos.includes('.')||has(f,'-A','--all'))?'Moves ALL new and changed files into the staging area (the basket).':p.pos.length?`Puts ${nmq(p.pos)} into the staging area (the basket) exactly as it is right now.`:'Needs to know WHAT to stage: a file name, or . for everything.',r.inited&&ch.unstaged.length+ch.untracked.length===0?'ℹ️ No new or modified files, so there is nothing to stage.':''];},
 commit:(p,r,f)=>{const ch=changes(r),m=val(f,'-m','--message'),n=ch.staged.length,auto=has(f,'-a','--all');
  if(has(f,'--amend'))return[`Rewrites the LAST commit${m?` with the message “${m}”`:''}, including anything staged. It gets a brand-new ID.`,pushedHead(r)?'⚠️ That commit is already on the remote. Amending rewrites shared history!':''];
  return[`Saves ${auto?'every tracked change plus ':''}what is in the staging area (${plural(n,'file')}) as a permanent snapshot${m?` labelled “${m}”`:''}.${m?'':' Add -m "message" — the garden has no editor.'}`,(n+(auto?ch.unstaged.length:0)===0&&!r.op)?'⚠️ Nothing is staged, so this will be refused. Run git add first!':''];},
 rm:(p,r,f)=>[has(f,'--cached')?'Stops tracking the file but leaves it on disk.':'Deletes the file from disk and stages the deletion.',''],
 mv:()=>['Renames a tracked file and stages the rename.',''],
 restore:(p,r,f)=>[has(f,'--staged')?'Takes the file out of the staging area; your edits stay in the file.':val(f,'-s','--source')?'Restores the file from an older commit.':'Throws away your uncommitted edits in the file, restoring the last saved version.',has(f,'--staged')||val(f,'-s','--source')?'':'⚠️ Discarded edits can\'t be recovered.'],
 clean:(p,r,f)=>[has(f,'-n')?'Dry run: lists the untracked files that WOULD be deleted.':'Deletes untracked files permanently.',has(f,'-f')?'⚠️ Untracked files are in no commit — they can\'t come back.':''],
 stash:p=>[{pop:'Brings back your newest stash and removes it from the shelf.',list:'Lists everything on the stash shelf.',apply:'Re-applies a stash but keeps it on the shelf.',drop:'Throws a stash away.',clear:'Empties the stash shelf.'}[p.pos[0]]||'Tucks your uncommitted changes onto a shelf and gives you a clean folder.',''],
 branch:(p,r,f)=>[has(f,'-d','-D')?`Deletes ${nmq(p.pos)||'a branch'}. ${has(f,'-D')?'Force: even unmerged commits are cut loose.':'Git refuses if it has unmerged work.'}`:has(f,'-m')?'Renames a branch.':p.pos.length?`Creates a new label “${p.pos[0]}” at your current commit. You stay where you are.`:'Lists branches. * marks the one you are on.',''],
 switch:(p,r,f)=>{const t=val(f,'-c','-C')||p.pos[0];const warn=r.inited&&dirtyFiles(r).size&&!val(f,'-c')?'ℹ️ You have uncommitted changes. Git will block the switch only if they clash with the other branch.':'';return[val(f,'-c','-C')?`Creates the branch “${t}” and moves you onto it.`:has(f,'--detach')?'Visits a commit without being on any branch (detached HEAD).':p.pos[0]==='-'?'Jumps back to the previous branch.':t?`Moves you to “${t}” and swaps your files to match it.`:'Moves you to another branch.',warn];},
 merge:(p,r,f)=>{const t=p.pos[0];if(has(f,'--abort'))return['Cancels the merge and restores everything.',''];if(!t)return['Brings another branch\'s commits into the branch you are on.',''];const id=r.inited?resolveRev(r,t):null;
  if(!id)return[`Merges “${t}” into your current branch.`,r.inited?`⚠️ I can't find “${t}”.`:'⚠️ Not a repository yet.'];const h=headId(r);if(isAnc(r,id,h))return[`Merges “${t}” into ${curName(r)}.`,'ℹ️ Already up to date — nothing to merge.'];
  if(isAnc(r,h,id)&&!has(f,'--no-ff'))return[`Merges “${t}” into ${curName(r)}. Your branch has nothing new of its own, so it's a simple fast-forward: the label slides ahead.`,''];
  const b=mergeBase(r,h,id),c=merge3(treeOf(r,b),headTree(r),treeOf(r,id),'a','b').conflicts;return[`Merges “${t}” into ${curName(r)} with a NEW merge commit that has two parents.`,c.length?`⚔️ Heads-up: ${c.join(', ')} changed on both sides — expect a conflict to fix by hand.`:'✅ Looks conflict-free.'];},
 rebase:(p,r,f)=>[has(f,'--continue','--abort')?'Continues or cancels a rebase that is in progress.':p.pos[0]?`Replays your branch's commits on top of “${p.pos[0]}”, creating new commits with new IDs.`:'Replays your commits on top of another branch.','⚠️ Never rebase commits other people already have.'],
 'cherry-pick':p=>[p.pos[0]?`Copies the single commit ${p.pos[0]} onto your current branch as a new commit.`:'Copies one commit onto your branch.',''],
 tag:(p,r,f)=>[p.pos[0]?`Puts a permanent name “${p.pos[0]}” on ${p.pos[1]||'the current commit'}${has(f,'-a')||val(f,'-m')?' (annotated: stores who/when/why)':''}.`:'Lists tags.',''],
 remote:p=>[p.pos[0]==='add'?'Saves a nickname for a remote URL. Nothing is uploaded yet.':'Shows or manages remotes (other copies of the repo).',''],
 fetch:()=>['Downloads new commits from the remote WITHOUT changing your branches or files. Always safe.',S.repo.remote?'':'⚠️ No remote yet. git remote add origin <url>'],
 pull:(p,r,f)=>[`Fetches new commits, then ${has(f,'--rebase')?'rebases your work on top of them':'merges them into your branch'}.`,r.remote?'':'⚠️ No remote yet.'],
 push:(p,r,f)=>{const rem=r.remote;if(!rem)return['Uploads your commits to the remote.','⚠️ No remote yet. git remote add origin <url>'];const bn=curName(r),tip=bn&&rem.branches[bn],h=headId(r);
  const w=has(f,'-f','--force')?'⚠️ Force pushing can erase teammates\' commits!':(tip&&h&&!isAnc(r,tip,h)&&tip!==h)?'⚠️ The remote has commits you don\'t. Expect a rejection — pull first.':'';
  return[`Uploads your commits to ${rem.name}${has(f,'-u','--set-upstream')?' and links your branch to its remote twin':''}.`,w];},
 log:(p,r,f)=>['Lists commits newest-first'+(has(f,'--oneline')?', one compact line each':'')+(has(f,'--all')?', across all branches':'')+'.',r.inited&&!headId(r)?'ℹ️ No commits yet.':''],
 show:()=>['Shows one commit in full: message plus exactly what it changed.',''],
 diff:(p,r,f)=>[has(f,'--staged','--cached')?'Compares the staging area with the last commit — what the NEXT commit will contain.':'Compares your working files with the staging area — edits not staged yet.',''],
 blame:()=>['Shows who last changed each line of a file, and in which commit.',''],
 reflog:()=>['Shows every place HEAD has been — your safety net for lost commits.',''],
 bisect:p=>[{start:'Starts a binary search for the commit that introduced a bug.',good:'Marks the current commit as working.',bad:'Marks the current commit as broken.',reset:'Ends the search and goes back.'}[p.pos[0]]||'Binary-searches history to find a bug-causing commit.',''],
 reset:(p,r,f)=>[has(f,'--hard')?'Moves the branch back AND overwrites your files to match.':has(f,'--soft')?'Moves the branch back but keeps your changes staged.':p.pos.length&&!resolveRev(r,p.pos[0]||'')?'Un-stages those files.':'Moves the branch back and clears the staging area (keeps your files).',has(f,'--hard')?'🔥 --hard discards uncommitted work. Rescue with git reflog.':''],
 revert:p=>[`Makes a NEW commit that cancels out ${p.pos[0]||'the chosen commit'}. History isn't rewritten, so it's safe to share.`,''],
 grep:()=>['Searches the text of your tracked files.',''],
 checkout:(p,r,f)=>val(f,'-b')?[`Creates the branch “${val(f,'-b')}” and moves you onto it (old-style; git switch -c is the modern form).`,'']:[p.pos[0]?`Moves to “${p.pos[0]}” — a branch, an old commit, or restores a file.`:'Switches branches or restores files.','']
};
let liveTimer=null;
function liveExplain(v){const t=tokenize(v),r=S.repo,toks=$('#toks'),sum=$('#sum'),warn=$('#warn');
 if(!t.length){toks.innerHTML='';sum.textContent='Start typing and I\'ll explain each word live. Try  git status  or  git help.';warn.hidden=true;return;}
 const sub=t[0]==='git'?t[1]:null;
 toks.innerHTML=t.map((w,i)=>{const[k,d]=describeTok(t,i,sub);return `<div class="tok ${k}"><b>${esc(t.q[i]?'"'+w+'"':w)}</b><span>${esc(d)}</span></div>`;}).join('');
 let s='',wn='';
 if(t[0]==='git'){if(!sub){s='Now type what you want Git to do: status, add, commit, branch, merge…';}
  else if(GIT[sub]||REFMAP[sub]){const e=REFMAP[sub];const{pos,f}=parseArgs(t.slice(2),['-m','--message','-c','-b','-C','-B','--author','-n']);
   try{const x=LIVE[sub]?LIVE[sub]({pos,f},r,f):[e?e.d:'',''];s=x[0];wn=x[1];}catch(err){s=e?e.d:'';}
   if(!r.inited&&!['init','clone','config','help'].includes(sub))wn='⚠️ This folder is not a repository yet — run git init first.';}
  else s='That is not a git command I know. Type git help for the list.';}
 else if(SHD[t[0]])s=SHD[t[0]][0].toUpperCase()+SHD[t[0]].slice(1)+'.';
 sum.textContent=s;warn.textContent=wn;warn.hidden=!wn;}

/* ---------- zones ---------- */
function renderZones(){const r=S.repo,ch=changes(r),conf=new Set(ch.conflicts),keys=new Set();
 const chip=(z,n,st,lab)=>{const k=z+'|'+n+'|'+st;keys.add(k);return `<span class="chip ${st?'s-'+st:''}${prevKeys.has(k)?'':' pop'}">${esc(n)}${lab?`<em>${lab}</em>`:''}</span>`;};
 const names=uniq([...Object.keys(r.work),...Object.keys(r.index)]).sort();
 const wk=names.map(f=>conf.has(f)?chip('w',f,'con','conflict'):r.work[f]===undefined?chip('w',f,'del','deleted'):r.index[f]===undefined?(isIgnored(r,f)?chip('w',f,'ign','ignored'):chip('w',f,'new','new')):r.work[f]!==r.index[f]?chip('w',f,'mod','edited'):chip('w',f,'','')).join('');
 const sg=ch.staged.map(s=>chip('s',s.k==='R'?`${s.from}→${s.f}`:s.f,s.k==='D'?'del':'stg',{A:'new',M:'edited',D:'deleted',R:'renamed'}[s.k])).join('');
 const ht=headTree(r),hid=headId(r);const rp=Object.keys(ht).sort().map(f=>chip('r',f,'','')).join('');
 let rm='',rmeta='';
 if(r.remote){const bs=r.remote.branches;const bn=(curName(r)&&bs[curName(r)])?curName(r):(bs.main?'main':Object.keys(bs)[0]);if(bn){rm=Object.keys(treeOf(r,bs[bn])).sort().map(f=>chip('c',f,'','')).join('');rmeta=`${r.remote.name}/${bn} @ ${bs[bn]}`;}else rmeta=r.remote.name+' (empty)';}
 prevKeys=keys;
 const Z=(e,t,sub,meta,body,emp,arrow)=>`<div class="zone"><h4><span>${e}</span>${t}</h4><div class="sub">${sub}</div>${meta?`<div class="meta">${esc(meta)}</div>`:''}<div class="chips">${body||`<span class="empty">${emp}</span>`}</div>${arrow?`<span class="arrow">${arrow} ›</span>`:''}</div>`;
 $('#zones').innerHTML=Z('🪴','Working folder','where you edit files',r.inited?'':'', wk,'no files yet — try touch hello.txt','add')+
  Z('🧺','Staging area','the basket for your next snapshot','',sg,r.inited?'empty basket':'needs git init','commit')+
  Z('📸','Local repo','your saved snapshots',hid?`${curName(r)||'detached'} @ ${hid}`:'',rp,r.inited?'no snapshots yet':'not a repo — git init','push')+
  Z('☁️','Remote','the shared copy online',rmeta,rm,r.remote?'nothing pushed yet':'no remote — git remote add','');}

/* ---------- commit graph ---------- */
const LANE_COL=['#4fd1a8','#ff7aa8','#69b7ff','#ffd25e','#b9a4ff','#ff9f7a'];
function renderGraph(){const r=S.repo,el=$('#graph');const all=Object.values(r.commits).sort((a,b)=>a.seq-b.seq);
 if(!all.length){el.innerHTML='<div class="empty">No commits yet — your story starts with <code>git commit</code> 📸</div>';$('#gcap').textContent='';return;}
 const hid=headId(r),tips=[...Object.values(r.branches),...Object.values(r.tags),...Object.values(r.tracking)];if(hid)tips.push(hid);
 const reach=new Set();tips.forEach(t=>ancestors(r,t).forEach(x=>reach.add(x)));
 const lane={};let nl=0;const isMain=n=>/^(main|master)$/.test(n);
 const order=[...Object.keys(r.branches).sort((a,b)=>(isMain(a)?0:1)-(isMain(b)?0:1)).map(n=>[n,r.branches[n]]),...Object.keys(r.tracking).map(n=>[n,r.tracking[n]])];if(isDet(r)&&hid)order.push(['HEAD',hid]);
 const walk=tip=>{const ch=[];let id=tip;while(id&&lane[id]===undefined&&r.commits[id]){ch.push(id);id=r.commits[id].parents[0];}if(ch.length){ch.forEach(c=>{lane[c]=nl;});nl++;}};
 order.forEach(([,t])=>walk(t));[...reach].sort((a,b)=>r.commits[b].seq-r.commits[a].seq).forEach(id=>{if(lane[id]===undefined)walk(id);});
 const ghosts=all.filter(c=>!reach.has(c.id));const gl=nl;const lanes=nl+(ghosts.length?1:0);ghosts.forEach(c=>{lane[c.id]=gl;});
 const XS=100,LH=96,PL=64,PT=84;const pos={};all.forEach((c,i)=>{pos[c.id]={x:PL+i*XS,y:PT+lane[c.id]*LH};});
 const W=PL*2+(all.length-1)*XS+30,H=PT+(lanes-1)*LH+70;const col=l=>l>=gl&&ghosts.length&&l===gl?'#a79fc9':LANE_COL[l%LANE_COL.length];const ink='#2b2250';
 let edges='',nodes='';
 all.forEach(c=>{c.parents.forEach((p,k)=>{if(!pos[p])return;const a=pos[p],b=pos[c.id],mx=(a.x+b.x)/2,g=!reach.has(c.id);const l=k===0?lane[c.id]:lane[p];
  edges+=`<path d="M${a.x} ${a.y} C${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}" fill="none" stroke="${col(l)}" stroke-width="5" stroke-linecap="round" ${g?'stroke-dasharray="3 9" opacity=".6"':''}/>`;});});
 const refs={};const addRef=(id,o)=>{if(id)(refs[id]=refs[id]||[]).push(o);};
 Object.entries(r.branches).forEach(([b,id])=>addRef(id,{t:(!isDet(r)&&r.head.branch===b)?'HEAD ➜ '+b:b,k:'b'}));
 if(isDet(r))addRef(hid,{t:'HEAD',k:'h'});Object.entries(r.tags).forEach(([t,id])=>addRef(id,{t:'🏷 '+t,k:'t'}));Object.entries(r.tracking).forEach(([t,id])=>addRef(id,{t:'☁ '+t,k:'r'}));
 all.forEach(c=>{const{x,y}=pos[c.id],g=!reach.has(c.id),l=lane[c.id],mg=c.parents.length>1,fill=col(l);
  const eyes=g?`<path d="M-7 -4 L-3 0 M-3 -4 L-7 0 M3 -4 L7 0 M7 -4 L3 0" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>`:`<circle cx="-5" cy="-2" r="2.3" fill="${ink}"/><circle cx="5" cy="-2" r="2.3" fill="${ink}"/>`;
  const mouth=g?`<path d="M-4 6 L4 6" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`:mg?`<circle cx="0" cy="6" r="2.4" fill="${ink}"/>`:`<path d="M-4 4 Q0 9 4 4" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`;
  const isH=c.id===hid;
  let pills='';(refs[c.id]||[]).forEach((o,i)=>{const w=o.t.length*6.5+16,py=-38-i*21;const f=o.k==='b'?fill:o.k==='h'?'#ff7aa8':o.k==='t'?'#ffd25e':'none';
   pills+=`<g transform="translate(0 ${py})"><rect x="${-w/2}" y="-9" width="${w}" height="18" rx="9" fill="${f}" ${o.k==='r'?`stroke="currentColor" stroke-dasharray="3 2"`:`stroke="${ink}"`} stroke-width="2"/><text y="4" text-anchor="middle" font-size="11" font-weight="800" font-family="Nunito,sans-serif" fill="${o.k==='r'?'currentColor':ink}">${esc(o.t)}</text></g>`;});
  nodes+=`<g transform="translate(${x} ${y})" ${g?'opacity=".55"':''}><title>${esc(c.id+' — '+c.msg+'\n'+c.author)}</title>${isH?`<circle r="23" fill="none" stroke="#ff7aa8" stroke-width="3" stroke-dasharray="4 4"/>`:''}<circle r="17" fill="${fill}" stroke="${ink}" stroke-width="3" ${g?'stroke-dasharray="4 3"':''}/>${eyes}${mouth}${pills}
   <text y="35" text-anchor="middle" font-size="10" font-family="JetBrains Mono,monospace" fill="currentColor" opacity=".7">${c.id}</text><text y="48" text-anchor="middle" font-size="11" font-weight="700" font-family="Nunito,sans-serif" fill="currentColor">${esc(c.msg.length>15?c.msg.slice(0,14)+'…':c.msg)}</text></g>`;});
 el.innerHTML=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="color:var(--tx)" role="img" aria-label="Commit history graph">${edges}${nodes}</svg>`;el.scrollLeft=el.scrollWidth;
 $('#gcap').textContent=`${plural(Object.keys(r.branches).length,'branch')} · ${plural(reach.size,'commit')}${ghosts.length?` · ${ghosts.length} orphaned (faded & dashed — still in the reflog)`:''}`;}
function renderAll(){renderZones();renderGraph();renderPrompt();liveExplain($('#cmd').value);}

/* ---------- command book ---------- */
function renderBook(){const cats=['All',...uniq(REF.map(x=>x.c))];
 let h=`<div class="tabs"><button class="btn ${S.bookTab==='cmds'?'on':'ghost'}" data-tab="cmds">Commands (${REF.length})</button><button class="btn ${S.bookTab==='concepts'?'on':'ghost'}" data-tab="concepts">Concepts (${CONCEPTS.length})</button></div>`;
 if(S.bookTab==='cmds'){const q=S.bookQ.toLowerCase();const list=REF.filter(x=>(S.bookCat==='All'||x.c===S.bookCat)&&(!q||(x.n+' '+x.d).toLowerCase().includes(q)));
  h+=`<div class="tools"><input type="search" id="bq" placeholder="Search commands…" value="${esc(S.bookQ)}" aria-label="Search commands">${cats.map(c=>`<button class="btn sm ${S.bookCat===c?'pink':'ghost'}" data-cat="${c}">${c}</button>`).join('')}</div><div class="cgrid">`;
  list.forEach(x=>{h+=`<div class="card cmd"><h3><span>${x.e}</span><code>git ${x.n}</code><span class="pill">${x.c}</span></h3><p>${esc(x.d)}</p><pre>${esc(x.ex)}</pre>${x.f.length?`<ul>${x.f.map(([k,v])=>`<li><code>${esc(k)}</code> — ${esc(v)}</li>`).join('')}</ul>`:''}${x.sim===false?`<span class="pill">read-only: concept in the garden</span>`:`<button class="btn sm mint" data-try="${esc(x.ex)}">Try it in the sandbox</button>`}</div>`;});
  if(!list.length)h+='<p class="empty">No commands match.</p>';h+='</div>';}
 else{h+='<div class="cgrid">'+CONCEPTS.map(c=>`<div class="card concept"><div class="big">${c.e}</div><h3>${esc(c.t)}</h3><p style="font-weight:600;margin:4px 0">${esc(c.x)}</p><div class="an">💭 ${esc(c.a)}</div></div>`).join('')+'</div>';}
 $('#v-book').innerHTML=h;}

/* ---------- boss quiz ---------- */
function startQuiz(wid){S.quiz={w:wid,i:0,score:0,answered:false};renderQuiz();setView('quiz');}
function renderQuiz(){const z=S.quiz,w=WORLDS.find(x=>x.id===z.w),qs=QUIZ[z.w];
 if(z.i>=qs.length){const prev=P.quiz[z.w]||0;const gain=Math.max(0,z.score-prev)*20;if(P.quiz[z.w]===undefined||z.score>prev){P.quiz[z.w]=z.score;saveProg();}if(gain)addXP(gain);if(z.score===qs.length)confetti();
  $('#v-quiz').innerHTML=`<div class="card quiz" style="text-align:center"><div class="bob" style="display:inline-block;width:120px">${gitty(z.score>=2?'cheer':'think')}</div><h2>${w.e} ${w.n} boss quiz: ${z.score}/${qs.length}</h2><p style="font-weight:800">${z.score===qs.length?'Flawless! 👑':z.score>=2?'Nice work!':'Good try — replay the quests and come back!'} ${gain?`+${gain} XP`:''}</p><div class="row" style="justify-content:center"><button class="btn mint" data-qz="again">Try again</button><button class="btn ghost" data-go="map">Back to the map</button></div></div>`;return;}
 const q=qs[z.i];$('#v-quiz').innerHTML=`<div class="card quiz"><span class="pill" style="background:${w.col};color:#2b2250">👑 ${w.n} boss · question ${z.i+1}/${qs.length}</span><h3 style="margin:10px 0 4px;font-size:1.3rem">${esc(q.q)}</h3>${q.o.map((o,i)=>`<button class="opt" data-opt="${i}">${esc(o)}</button>`).join('')}<div id="qfb"></div></div>`;}
function answerQuiz(i){const z=S.quiz;if(z.answered)return;z.answered=true;const q=QUIZ[z.w][z.i];const ok=i===q.a;if(ok)z.score++;
 document.querySelectorAll('.opt').forEach((b,k)=>{b.disabled=true;if(k===q.a)b.classList.add('right');else if(k===i)b.classList.add('wrong');});
 $('#qfb').innerHTML=`<p style="font-weight:800;margin:10px 0">${ok?'✅ Correct!':'❌ Not quite.'} ${esc(q.x)}</p><button class="btn mint" data-qz="next">${z.i+1>=QUIZ[z.w].length?'See result':'Next question'}</button>`;}

/* ---------- events ---------- */
document.addEventListener('click',e=>{const t=e.target.closest('button,[data-q]');if(!t)return;
 if(t.id==='brand'){go('map');return;}
 if(t.dataset.view){go(t.dataset.view);return;}
 if(t.dataset.go){go(t.dataset.go);return;}
 if(t.dataset.q){startQuest(t.dataset.q);return;}
 if(t.dataset.quiz){startQuiz(t.dataset.quiz);return;}
 if(t.dataset.ins!==undefined){insert(t.dataset.ins);return;}
 if(t.dataset.tab){S.bookTab=t.dataset.tab;renderBook();return;}
 if(t.dataset.cat){S.bookCat=t.dataset.cat;renderBook();return;}
 if(t.dataset.try){startSandbox(false);insert(t.dataset.try);return;}
 if(t.dataset.opt!==undefined){answerQuiz(+t.dataset.opt);return;}
 if(t.dataset.qz){if(t.dataset.qz==='again')startQuiz(S.quiz.w);else{S.quiz.i++;S.quiz.answered=false;renderQuiz();}return;}
 if(t.dataset.m){const a=t.dataset.m;closeModal();if(a==='next')startQuest(t.dataset.id);else if(a==='map')go('map');return;}
 if(t.id==='resetProg'){if(t.dataset.arm){P={xp:0,done:{},quiz:{}};saveProg();updateHeader();renderMap();}else{t.dataset.arm='1';t.textContent='Click again to erase everything';}return;}
 if(t.id==='run'){const i=$('#cmd');exec(i.value);i.value='';liveExplain('');i.focus();return;}
 const a=t.dataset.act;if(a){
  if(a==='hint')showHint();else if(a==='restart')startQuest(S.quest.id);else if(a==='map')go('map');
  else if(a==='sample'){startSandbox(true);runSilent(['git clone https://github.com/gitty/garden.git']);printLines([[['(sample project loaded: you cloned https://github.com/gitty/garden.git)','dim']]]);renderAll();}
  else if(a==='blank')startSandbox(true);
  else if(a==='mate'){exec('teammate');}
 }});
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
$('#cmd').addEventListener('keydown',e=>{const i=e.target;
 if(e.key==='Enter'){exec(i.value);i.value='';liveExplain('');}
 else if(e.key==='ArrowUp'){e.preventDefault();if(S.hi>0){S.hi--;i.value=S.hist[S.hi]||'';liveExplain(i.value);}}
 else if(e.key==='ArrowDown'){e.preventDefault();if(S.hi<S.hist.length-1){S.hi++;i.value=S.hist[S.hi];}else{S.hi=S.hist.length;i.value='';}liveExplain(i.value);}
 else if(e.key==='Tab'){e.preventDefault();complete();}
 else if(e.key==='l'&&e.ctrlKey){e.preventDefault();$('#tout').innerHTML='';}});
$('#cmd').addEventListener('input',e=>liveExplain(e.target.value));
document.addEventListener('input',e=>{if(e.target.id==='bq'){S.bookQ=e.target.value;const pos=e.target.selectionStart;renderBook();const n=$('#bq');n.focus();n.setSelectionRange(pos,pos);}});

/* ---------- boot ---------- */
$('#logo').innerHTML=gitty('happy');renderChips();updateHeader();renderMap();setView('map');
