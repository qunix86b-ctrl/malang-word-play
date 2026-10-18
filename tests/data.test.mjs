import test from 'node:test';
import assert from 'node:assert/strict';
import { words, categories, getSpeech } from '../src/data.js';
import { stat, readFile } from 'node:fs/promises';
import { question, nextTarget, feedback } from '../src/game.js';

test('202 unique items: 30 per original category and 26 per alphabet case',()=>{
  assert.equal(words.length,202);assert.equal(new Set(words.map(w=>w.id)).size,202);
  for(const category of categories)assert.equal(words.filter(w=>w.category===category.id).length,['uppercase','lowercase'].includes(category.id)?26:30);
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
test('alphabet uses English letter names and separate case identifiers',()=>{
  const upper=words.filter(w=>w.category==='uppercase'),lower=words.filter(w=>w.category==='lowercase');
  assert.equal(upper.map(w=>w.symbol).join(''),'ABCDEFGHIJKLMNOPQRSTUVWXYZ');assert.equal(lower.map(w=>w.symbol).join(''),'abcdefghijklmnopqrstuvwxyz');
  for(let i=0;i<26;i++){assert.deepEqual(getSpeech(lower[i],'ko'),{language:'en',text:upper[i].symbol});assert.notEqual(upper[i].id,lower[i].id);}
  assert.equal(question(upper[0],'ko').text,'대문자 에이를 찾아보세요!');assert.equal(question(lower[0],'en').text,'Find lowercase A!');
});
test('Android manifest declares every permission required by WebView audio capture',async()=>{
  const bridge=await readFile('node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java','utf8');
  const block=bridge.match(/if \(Arrays\.asList\(request\.getResources\(\)\)\.contains\("android\.webkit\.resource\.AUDIO_CAPTURE"\)\) \{([\s\S]*?)\}/)[1];
  const required=[...block.matchAll(/Manifest\.permission\.([A-Z_]+)/g)].map(m=>m[1]);
  assert.ok(required.length>0);
  const manifest=await readFile('android/app/src/main/AndroidManifest.xml','utf8');
  for(const permission of required)assert.ok(manifest.includes(`android:name="android.permission.${permission}"`),`Missing WebView audio permission: ${permission}`);
});
