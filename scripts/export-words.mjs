import { writeFile } from 'node:fs/promises';
import { words } from '../src/data.js';
await writeFile('scripts/words.json',JSON.stringify(words,null,2));
