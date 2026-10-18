import test from 'node:test';
import assert from 'node:assert/strict';
import { words, categories, getSpeech } from '../src/data.js';
import { stat, readFile } from 'node:fs/promises';
import { question, nextTarget, feedback } from '../src/game.js';

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
test('find prompts use correct Korean particles and Korean Hangul speech',()=>{
  assert.equal(question(words.find(w=>w.ko==='코끼리'),'ko').text,'코끼리를 찾아보세요!');
  assert.equal(question(words.find(w=>w.ko==='곰'),'ko').text,'곰을 찾아보세요!');
  assert.equal(question(words.find(w=>w.category==='hangul'),'en').language,'ko');
});
test('every game instruction and feedback has offline audio',async()=>{
  const prompts=words.flatMap(w=>['ko','en'].map(l=>question(w,l)));
  prompts.push(...['ko','en'].flatMap(l=>[true,false].map(c=>feedback(c,l))));
  for(const p of prompts)assert.ok((await stat(`public/audio/${p.language}/${p.file}.mp3`)).size>1000);
});
test('game visits all visible words before repeating and avoids immediate repeat',()=>{
  const items=words.filter(w=>w.category==='animals'),seen=new Set();let last;
  const targets=[];for(let i=0;i<30;i++){last=nextTarget(items,seen,last?.id);targets.push(last.id);}
  assert.equal(new Set(targets).size,30);assert.notEqual(nextTarget(items,seen,last.id).id,last.id);
});
