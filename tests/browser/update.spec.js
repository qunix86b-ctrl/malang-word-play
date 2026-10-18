import {test,expect} from '@playwright/test';
import {words} from '../../src/data.js';
import {question} from '../../src/game.js';
async function openRecorder(page){await page.locator('#settings').click();const numbers=(await page.locator('.gate-label').textContent()).match(/\d+/g).map(Number);await page.locator('#answer').fill(String(numbers[0]+numbers[1]));await page.locator('#gate').getByRole('button').click();await page.locator('#record-mode').click();}
async function answer(page){const text=await page.locator('#game-question').textContent();const word=words.find(w=>w.category==='animals'&&question(w,'ko').text===text);await page.locator(`[data-word="${word.id}"]`).click();return text;}
test('long praise finishes before next question; taps cannot interrupt praise',async({page})=>{
  await page.addInitScript(()=>{
    const original=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){
      if(this.src.endsWith('/correct.mp3')){window.praiseStarted=performance.now();setTimeout(()=>{window.praiseEnded=performance.now();this.dispatchEvent(new Event('ended'));},4500);return Promise.resolve();}
      return original.call(this);
    };
  });
  await page.goto('/');await page.locator('#find-mode').click();const previous=await answer(page);
  await expect(page.locator('#repeat-question')).toBeDisabled();await page.locator('.word-card').last().click();await page.waitForTimeout(3200);
  await expect(page.locator('#game-question')).toHaveText(previous);expect(await page.evaluate(()=>window.praiseEnded)).toBeUndefined();
  await expect(page.locator('#game-question')).not.toHaveText(previous,{timeout:5000});
  expect(await page.evaluate(()=>performance.now()-window.praiseStarted)).toBeGreaterThanOrEqual(4500);
});
test('leaving game during praise never starts a stale next round',async({page})=>{
  await page.goto('/');await page.locator('#find-mode').click();await answer(page);await page.locator('#listen-mode').click();await page.waitForTimeout(5000);await expect(page.locator('#game-question')).toHaveCount(0);
});
test('uppercase and lowercase have 26 visible letters, English letter sound and finding games',async({page})=>{
  await page.goto('/');
  for(const [category,first,last] of [['uppercase','A','Z'],['lowercase','a','z']]){
    await page.locator(`[data-category="${category}"]`).click();await expect(page.locator('.word-card')).toHaveCount(26);
    await expect(page.locator('.word-card .symbol').first()).toHaveText(first);await expect(page.locator('.word-card .symbol').last()).toHaveText(last);
    await page.locator('.word-card').first().click();await expect(page.locator('#now-playing')).toContainText('AI 목소리');
    expect(await page.locator('.word-card').evaluateAll(cards=>cards.every(c=>c.getBoundingClientRect().bottom<=innerHeight))).toBeTruthy();
    await page.locator('#find-mode').click();await expect(page.locator('#game-question')).toContainText(category==='uppercase'?'대문자':'소문자');
    await page.locator('[data-lang="en"]').click();await expect(page.locator('#game-question')).toContainText(`Find ${category}`);
    await page.locator('#listen-mode').click();await page.locator('[data-lang="ko"]').click();
  }
  await page.screenshot({path:'output/alphabet-tablet.png'});
  await openRecorder(page);await page.locator('#record-category').selectOption('uppercase');await expect(page.locator('#record-word option')).toHaveCount(26);
});
test('permission button requests microphone without recording and releases tracks',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async constraints=>{window.permissionStream=await original(constraints);return window.permissionStream;};});
  await openRecorder(page);await page.locator('#mic-permission').click();await expect(page.locator('#mic-status')).toContainText('허용됐어요');
  expect(await page.evaluate(()=>window.permissionStream.getTracks().every(track=>track.readyState==='ended'))).toBeTruthy();await expect(page.locator('#record-stop')).toBeDisabled();await expect(page.locator('#save-record')).toBeDisabled();
  await page.locator('#mic-settings').click();await expect(page.locator('#mic-help')).toBeVisible();await page.screenshot({path:'output/microphone-permission.png'});
});
test('denied permission provides visible instructions and preserves retry button',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{navigator.permissions.query=async()=>({state:'denied'});navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
  await openRecorder(page);await page.locator('#mic-permission').click();await expect(page.locator('#mic-status')).toContainText('차단');await expect(page.locator('#mic-help')).toBeVisible();await expect(page.locator('#mic-permission')).toBeEnabled();
});
test('returning after granting permission clears old denied instructions',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{window.micState='denied';navigator.permissions.query=async()=>({state:window.micState});});
  await openRecorder(page);await expect(page.locator('#mic-help')).toBeVisible();
  await page.evaluate(()=>{window.micState='granted';window.dispatchEvent(new Event('focus'));});
  await expect(page.locator('#mic-status')).toContainText('허용되어');await expect(page.locator('#mic-help')).toBeHidden();await expect(page.locator('#mic-permission')).toHaveText('마이크 연결 확인하기');
  await page.locator('#record-start').click();await expect(page.locator('#record-status')).toContainText('녹음 중');await page.locator('#record-stop').click();await expect(page.locator('#save-record')).toBeEnabled();
});
test('OS permission granted but capture denied does not ask for the same permission again',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{navigator.permissions.query=async()=>({state:'granted'});navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Capture blocked','NotAllowedError');};});
  await openRecorder(page);await page.locator('#mic-permission').click();await expect(page.locator('#mic-status')).toContainText('권한은 허용');await expect(page.locator('#mic-help')).toBeHidden();
  await page.locator('#record-start').click();await expect(page.locator('#mic-status')).toContainText('녹음 연결이 차단');await expect(page.locator('#mic-help')).toBeHidden();await expect(page.locator('#record-start')).toBeEnabled();
});
