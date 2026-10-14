#!/bin/sh
# Rebuilds index.html from the files in src/
cat src/head.html src/engine.js src/data.js src/ui.js > index.html
printf '</script></body></html>\n' >> index.html
echo "Built index.html"
