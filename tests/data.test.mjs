import test from 'node:test';
import assert from 'node:assert/strict';
import { words, categories, getSpeech } from '../src/data.js';
import { stat, readFile } from 'node:fs/promises';

test('150 unique bilingual items, 30 per category',()=>{
  assert.equal(words.length,150);assert.equal(new Set(words.map(w=>w.id)).size,150);
  for(const category of categories)assert.equal(words.filter(w=>w.category===category.id).length,30);
  for(const w of words){assert.ok(w.ko);assert.ok(w.en);}
});
test('Hangul is pronounced in Korean in either UI language',()=>{
  for(const w of words.filter(w=>w.category==='hangul'))assert.deepEqual(getSpeech(w,'en'),{text:w.ko,language:'ko'});
  assert.deepEqual(getSpeech(words[0],'en'),{text:'Dog',language:'en'});
});
test('Every playable item has nonempty bundled neural audio',async()=>{
  for(const w of words)for(const lang of ['ko','en']){
    const speech=getSpeech(w,lang);
    const file=await stat(`public/audio/${speech.language}/${w.id}.mp3`);
    assert.ok(file.size>1000,`${w.id} ${lang}`);
  }
});
test('Photo sticker atlases have actual alpha channels',async()=>{
  for(const c of categories.slice(0,3)){
    const png=await readFile(`public/stickers/${c.id}.png`);
    assert.equal(png[25],6,'RGBA PNG required');
    assert.ok(png.readUInt32BE(16)>1000);
  }
});
