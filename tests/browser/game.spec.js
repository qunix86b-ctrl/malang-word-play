import {test,expect} from '@playwright/test';
import {words} from '../../src/data.js';
import {question} from '../../src/game.js';
async function assertFits(page){
  await expect(page.locator('.word-card')).toHaveCount(30);
  const fits=await page.locator('.word-card').evaluateAll(cards=>cards.every(card=>{const b=card.getBoundingClientRect();return b.top>=0&&b.left>=0&&b.bottom<=innerHeight+1&&b.right<=innerWidth+1&&b.height>=44&&b.width>=44;}));
  expect(fits).toBeTruthy();await expect(page.locator('.pagination')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBeTruthy();
}
test('tablet shows all 30 on one screen in portrait and landscape, including game',async({page})=>{
  for(const [width,height] of [[1280,800],[800,1280],[1024,768],[600,960],[960,600]]){
    await page.setViewportSize({width,height});await page.goto('/');await assertFits(page);
    await page.locator('#find-mode').click();await assertFits(page);
    if(width===1280)await page.screenshot({path:'output/tablet-game.png'});
    if(width===800)await page.screenshot({path:'output/tablet-portrait.png'});
    await page.locator('[data-category="food"]').click();await assertFits(page);
  }
});
test('find game handles wrong answer, correct answer, replay, mode and category changes',async({page})=>{
  await page.goto('/');await page.locator('#find-mode').click();
  const prompt=await page.locator('#game-question').textContent();const target=words.find(w=>question(w,'ko').text===prompt&&w.category==='animals');
  const wrong=words.find(w=>w.category==='animals'&&w.id!==target.id);
  await page.locator(`[data-word="${wrong.id}"]`).click();await expect(page.locator('#game-feedback')).toContainText('다시');await expect(page.locator('#game-question')).toHaveText(prompt);
  await page.locator('#repeat-question').click();await expect(page.locator('#game-question')).toHaveText(prompt);
  await page.locator(`[data-word="${target.id}"]`).click();await expect(page.locator('#game-feedback')).toContainText('맞았어요');await expect(page.locator('.found')).toHaveCount(1);
  await expect(page.locator('#game-question')).not.toHaveText(prompt,{timeout:12000});
  await page.locator('[data-lang="en"]').click();await expect(page.locator('#game-question')).toContainText('Find');
  await page.locator('[data-category="food"]').click();const food=await page.locator('#game-question').textContent();expect(words.some(w=>w.category==='food'&&question(w,'en').text===food)).toBeTruthy();
  await page.locator('#listen-mode').click();await expect(page.locator('#game-question')).toHaveCount(0);await page.locator('.word-card').first().click();await expect(page.locator('#now-playing')).toContainText('Apple');
});
test('phone game asks only about visible choices and works offline',async({page,context})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await page.evaluate(async()=>await navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);
  await page.locator('#next').click();await page.locator('#find-mode').click();const prompt=await page.locator('#game-question').textContent();const target=words.find(w=>w.category==='animals'&&question(w,'ko').text===prompt);
  await expect(page.locator(`[data-word="${target.id}"]`)).toBeVisible();await page.locator(`[data-word="${target.id}"]`).click();await expect(page.locator('#game-feedback')).toContainText('맞았어요');await page.locator('#listen-mode').click();await page.waitForTimeout(3000);await expect(page.locator('#game-question')).toHaveCount(0);
  await context.setOffline(false);
});
