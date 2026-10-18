import {test,expect} from '@playwright/test';
async function settings(page){await page.getByRole('button',{name:'보호자 설정'}).click();const text=await page.locator('.gate-label').textContent();const [a,b]=text.match(/\d+/g).map(Number);await page.locator('#answer').fill(String(a+b));await page.getByRole('button',{name:'설정 열기'}).click();}
test('tablet: all categories, pagination, bilingual playback and no overflow',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.locator('.word-card')).toHaveCount(6);
  await page.screenshot({path:'output/tablet.png',fullPage:true});
  for(const category of ['animals','food','things','numbers','hangul']){
    await page.locator(`[data-category="${category}"]`).click();
    for(let i=0;i<5;i++){
      await expect(page.locator('.word-card')).toHaveCount(6);
      if(i<4)await page.getByRole('button',{name:'다음 단어'}).click();
    }
    await expect(page.getByRole('button',{name:'다음 단어'})).toBeDisabled();
  }
  await page.locator('[data-category="animals"]').click();await page.getByRole('button',{name:'English',exact:true}).click();
  await expect(page.locator('.word-card').first()).toContainText('Dog');
  await page.locator('.word-card').first().click();await expect(page.locator('#now-playing')).toContainText('AI 목소리');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();expect(errors).toEqual([]);
});
test('phone: readable cards and horizontal layout fits',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await expect(page.locator('.word-card')).toHaveCount(6);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:'output/phone.png',fullPage:true});
  await page.setViewportSize({width:320,height:640});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('record, save, persist, isolate languages and delete',async({page})=>{
  await page.goto('/');await settings(page);await page.getByRole('button',{name:'우리 목소리 녹음하기'}).click();
  await expect(page.locator('#record-status')).toContainText('아직');
  await page.getByRole('button',{name:'녹음 시작',exact:true}).click();await expect(page.locator('#record-status')).toContainText('녹음 중');
  await page.waitForTimeout(1200);await page.getByRole('button',{name:'녹음 끝내기'}).click();
  await expect(page.locator('#save-record')).toBeEnabled();await page.locator('#save-record').click();
  await expect(page.locator('#record-status')).toContainText('저장된 목소리');
  await page.locator('#record-lang').selectOption('en');await expect(page.locator('#record-status')).toContainText('아직');
  await page.locator('#record-lang').selectOption('ko');await expect(page.locator('#record-status')).toContainText('저장된 목소리');
  await page.getByRole('button',{name:'닫기',exact:true}).click();await page.reload();await page.locator('.word-card').first().click();
  await expect(page.locator('#now-playing')).toContainText('가족 목소리');
  await settings(page);await page.getByRole('button',{name:'우리 목소리 녹음하기'}).click();
  page.once('dialog',dialog=>dialog.accept());await page.locator('#delete-saved').click();await expect(page.locator('#record-status')).toContainText('아직');
});
test('closing while recording releases microphone',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{const real=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async c=>{window.testStream=await real(c);return window.testStream;};});
  await settings(page);await page.getByRole('button',{name:'우리 목소리 녹음하기'}).click();await page.locator('#record-start').click();
  await expect(page.locator('#record-status')).toContainText('녹음 중');await page.getByRole('button',{name:'닫기',exact:true}).click();
  expect(await page.evaluate(()=>window.testStream.getTracks().every(t=>t.readyState==='ended'))).toBeTruthy();
});
test('offline reload keeps all core assets and speech',async({page,context})=>{
  await page.goto('/');await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.reload();await context.setOffline(true);await page.reload();
  await expect(page.locator('.word-card')).toHaveCount(6);await page.locator('.word-card').first().click();
  await expect(page.locator('#now-playing')).toContainText('AI 목소리');
  await context.setOffline(false);
});
test('backup export/import preserves the recorded slot and rejects invalid input',async({page})=>{
  await page.goto('/');await settings(page);await page.getByRole('button',{name:'우리 목소리 녹음하기'}).click();
  await page.locator('#record-start').click();await expect(page.locator('#record-status')).toContainText('녹음 중');
  await page.waitForTimeout(700);await page.locator('#record-stop').click();await expect(page.locator('#save-record')).toBeEnabled();await page.locator('#save-record').click();await expect(page.locator('#record-status')).toContainText('저장된 목소리');
  await page.locator('#back-settings').click();const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;const path=await download.path();
  await page.getByRole('button',{name:'우리 목소리 녹음하기'}).click();page.once('dialog',d=>d.accept());await page.locator('#delete-saved').click();await expect(page.locator('#record-status')).toContainText('아직');await page.locator('#back-settings').click();
  page.once('dialog',d=>d.accept());await page.locator('#backup-file').setInputFiles(path);await expect(page.locator('#toast')).toContainText('1개의 녹음');
  await page.getByRole('button',{name:'우리 목소리 녹음하기'}).click();await expect(page.locator('#record-status')).toContainText('저장된 목소리');await page.locator('#back-settings').click();
  await page.locator('#backup-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"app":"other"}')});await expect(page.locator('#toast')).toContainText('녹음 파일이 아니에요');
});
test('microphone denial can be retried without leaving disabled controls',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
  await settings(page);await page.getByRole('button',{name:'우리 목소리 녹음하기'}).click();await page.locator('#record-start').click();
  await expect(page.locator('#toast')).toContainText('마이크 권한');await expect(page.locator('#record-start')).toBeEnabled();
});
test('visual contact sheets for every photographic sticker',async({page})=>{
  await page.goto('/');
  for(const category of ['animals','food','things']){
    await page.locator(`[data-category="${category}"]`).click();const cards=[];
    for(let i=0;i<5;i++){cards.push(await page.locator('.cards').innerHTML());if(i<4)await page.locator('#next').click();}
    await page.evaluate(html=>{let gallery=document.createElement('div');gallery.id='gallery';gallery.className='cards';gallery.style='position:absolute;top:0;left:0;width:1280px;background:#fff9ef;z-index:100;padding:15px;grid-template-columns:repeat(6,1fr);gap:12px';gallery.innerHTML=html;document.body.append(gallery);},cards.join(''));
    await page.locator('#gallery').screenshot({path:`output/gallery-${category}.png`});await page.locator('#gallery').evaluate(el=>el.remove());
  }
});
