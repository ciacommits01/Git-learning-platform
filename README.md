# 🌱 Git Garden — learn Git by playing

A single-page, zero-dependency Git learning game. Everything runs in your browser;
no server, no database, no account.

## Run it on your laptop (pick ONE)

**Easiest — just open the file**
Double-click `index.html`. Done. (Works in any modern browser.)

**Option B — tiny local web server (Python is pre-installed on macOS/Linux)**
```
cd git-garden
python3 -m http.server 8080
```
Open http://localhost:8080  (Windows: use `py -m http.server 8080`)

**Option C — Node.js**
```
cd git-garden
npx serve .
```

Notes
- Fonts (Fredoka, Nunito, JetBrains Mono) load from Google Fonts. Offline, the page still works with fallback fonts.
- Your XP/quest progress is saved in your browser (localStorage), per browser.

## Host it online for free (optional)
Upload the `index.html` file to any static host:
- **GitHub Pages**: new repo → add `index.html` → Settings → Pages → deploy from `main` branch.
- **Netlify Drop**: drag the folder onto https://app.netlify.com/drop
- **Cloudflare Pages / Vercel**: connect the repo, no build command, output directory `/`.

## Project layout
```
index.html        the finished game (generated, self-contained)
src/head.html     page + CSS
src/engine.js     the pretend-Git engine (no DOM, testable in Node)
src/data.js       command reference, concepts, quests, quizzes
src/ui.js         mascot, map, terminal, live explainer, graph, zones
build.sh          rebuilds index.html from src/
tests/run.sh      plays all 32 quests with scripted solutions (needs Node)
```

## Editing
1. Change files in `src/` (e.g. add a quest in `src/data.js` → `QUESTS`).
2. Run `./build.sh` (or on Windows: concatenate head.html, engine.js, data.js, ui.js, then `</script></body></html>`).
3. Optional: `./tests/run.sh` should print `quests failing: 0 of N`.

A quest is: `{id, w:worldId, t:title, e:emoji, xp, setup:[commands], story, goals:[{t, ok:(repo,history)=>bool}], hints:[…], learn}`.
