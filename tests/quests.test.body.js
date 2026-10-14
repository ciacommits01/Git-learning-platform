const SOL={
 init:['git init'],config:['git config user.name "Ada"','git config user.email "a@b.c"'],status:['git status'],
 add:['git add seeds.txt','git add tools.txt'],commit:['git commit -m "Add rose seeds"'],log:['git log','git log --oneline'],
 diff:['git diff','git add recipe.txt','git diff --staged'],restore:['git restore notes.txt'],unstage:['git restore --staged secret.txt'],
 amend:['git commit --amend -m "Add feature"'],reset:['git reset --hard HEAD~1'],revert:['REVERT'],reflog:['REFLOG'],
 visit:['git switch --detach HEAD~1','git switch main'],branch:['git switch -c flowers'],
 oncommit:['touch roses.txt','git add .','git commit -m "Add roses"'],ff:['git merge flowers'],merge3:['git merge flowers'],
 conflict:['git merge spicy','edit menu.txt','git add menu.txt','git commit'],
 tidy:['git branch -d old-idea','git branch -d wild-idea','git branch -D wild-idea'],
 cloud:['git remote add origin https://github.com/you/garden.git'],push:['git push -u origin main'],
 fetch:['git fetch','git log origin/main --oneline'],pull:['git pull'],clone:['git clone https://github.com/gitty/garden.git'],
 rejected:['git push','git pull','git push'],stash:['git switch hotfix','git stash','git switch hotfix','git switch main','git stash pop'],
 cherry:['CHERRY'],rebase:['git rebase main'],tag:['git tag -a v1.0.0 -m "First release"'],
 ignore:['echo "*.log" >> .gitignore','echo "node_modules/" >> .gitignore','git add .gitignore','git commit -m "Add gitignore"'],bisect:['BISECT']
};
let bad=0;
for(const q of QUESTS){
  const r=newRepo();const h=[];
  for(const c of q.setup){const X=runLine(r,c);if(!X.ok){console.log('SETUP FAIL',q.id,c,JSON.stringify(X.o));}}
  r.flags={};
  const run=(c)=>{h.push(c);return runLine(r,c);};
  const pre=q.goals.map(g=>g.ok(r,h));
  for(let c of SOL[q.id]){
    if(c==='REVERT'){c='git revert '+Object.values(r.commits).find(x=>x.msg==='Add bug').id;}
    if(c==='REFLOG'){const e=r.reflog.find(e=>r.commits[e.id].msg==='Three precious work');c='git reset --hard '+e.id;}
    if(c==='CHERRY'){c='git cherry-pick '+Object.values(r.commits).find(x=>x.msg==='Add logo').id;}
    if(c==='BISECT'){const first=Object.values(r.commits).sort((a,b)=>a.seq-b.seq)[0].id;
      run('git bisect start');run('git bisect bad');run('git bisect good '+first);
      for(let i=0;i<6&&!r.flags.bisectFoundMsg;i++){run(/BUG/.test(r.work['status.txt'])?'git bisect bad':'git bisect good');}
      run('git bisect reset');continue;}
    const X=run(c);
    if(process.env.V)console.log(q.id,'>',c,X.ok?'':'(ERR)',X.o.map(l=>l.map(s=>s[0]).join('')).join(' | ').slice(0,200));
  }
  const post=q.goals.map(g=>g.ok(r,h));
  if(!post.every(Boolean)||pre.every(Boolean)){bad++;console.log(post.every(Boolean)?'ALREADY DONE':'FAIL',q.id,'pre',pre,'post',post);}
}
console.log('quests failing:',bad,'of',QUESTS.length);
