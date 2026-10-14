#!/bin/sh
# Plays every quest through the engine with a scripted solution (needs Node.js)
cat src/engine.js src/data.js tests/quests.test.body.js > /tmp/gg-test.js && node /tmp/gg-test.js
