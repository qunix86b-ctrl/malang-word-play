import {writeFile} from 'node:fs/promises';
import {words} from '../src/data.js';
import {question,feedback} from '../src/game.js';
const prompts=new Map();
for(const word of words)for(const lang of ['ko','en']){const p=question(word,lang);prompts.set(`${p.language}/${p.file}`,p);}
for(const lang of ['ko','en'])for(const correct of [true,false]){const p=feedback(correct,lang);prompts.set(`${p.language}/${p.file}`,p);}
await writeFile('scripts/game-audio.json',JSON.stringify([...prompts.values()],null,2));
