import '@fontsource/jua';
import '@fontsource-variable/noto-sans-kr';
import './style.css';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { categories, words } from './data.js';
import { sticker } from './stickers.js';
import { speak, stopAudio, playBlob, playPrompt } from './audio.js';
import { question, feedback, nextTarget } from './game.js';
import { microphoneStatus, requestMicrophone, openMicrophoneSettings, isAndroidApp, watchMicrophoneStatus, microphoneErrorMessage } from './permissions.js';
import { allRecordings, getRecording, saveRecordings, deleteRecording, recordingKey } from './storage.js';

const defaults={lang:'ko',voice:'mom',rate:0.9,labels:true};
const BackupFiles=registerPlugin('BackupFiles');
let settings={...defaults};
try {const saved=JSON.parse(localStorage.getItem('malang-settings')||'{}');settings={...defaults,...saved};}catch{}
if(!['ko','en'].includes(settings.lang))settings.lang='ko';
if(!['mom','child','ai'].includes(settings.voice))settings.voice='mom';
if(![0.8,0.9,1].includes(settings.rate))settings.rate=0.9;
let category='animals',page=0, selected=null, installPrompt, highlightTimer;
const tabletQuery=matchMedia('(min-width: 600px) and (min-height: 600px)');
let gameMode=false,target=null,solved=false,nextTimer,gameEpoch=0;
const seen=new Set();
function visibleWords(){const items=words.filter(w=>w.category===category);return tabletQuery.matches?items:items.slice(page*6,page*6+6);}
function cancelRound(){clearTimeout(nextTimer);gameEpoch++;stopAudio();}
function resetRound(){cancelRound();target=null;solved=false;seen.clear();}
async function sayPrompt(prompt){try{return await playPrompt(prompt,settings.rate);}catch{toast('소리를 재생하지 못했어요. 다시 듣기를 눌러 주세요.');return false;}}
function newRound(){cancelRound();target=nextTarget(visibleWords(),seen,target?.id);solved=false;render();sayPrompt(question(target,settings.lang));}
async function chooseWord(word,button){
  if(!gameMode){playWord(word,button);return;}
  if(solved||!target)return;
  const correct=word.id===target.id;
  document.querySelector('#game-feedback').textContent=feedback(correct,settings.lang).text;
  if(!correct){sayPrompt(feedback(false,settings.lang));return;}
  solved=true;button.classList.add('found');const epoch=gameEpoch;
  const repeat=document.querySelector('#repeat-question');repeat.disabled=true;
  const completed=await sayPrompt(feedback(true,settings.lang));
  if(epoch!==gameEpoch||!gameMode||modal.open||document.hidden)return;
  if(completed)nextTimer=setTimeout(()=>{if(epoch===gameEpoch&&gameMode&&!modal.open&&!document.hidden)newRound();},500);
  else {repeat.disabled=false;repeat.innerHTML='다음 문제 →';}
}
tabletQuery.addEventListener('change',()=>{resetRound();page=0;if(gameMode)newRound();else render();});
let recorder, stream, recordingTimer, draft, recordContext, recordingGeneration=0;
const app=document.querySelector('#app'),modal=document.querySelector('#modal');
const icons={sound:'<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM17 8q5 4 0 8M19 4q9 8 0 16"/></svg>',gear:'<svg viewBox="0 0 24 24"><path d="m9 3-1 3-3 1-2 4 2 2 1 4 4 2 2-1 4 1 3-4-1-3 2-3-3-4-3 1-3-3z"/><circle cx="12" cy="11" r="3"/></svg>',mic:'<svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>'};
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),4000);}
function persist(){try{localStorage.setItem('malang-settings',JSON.stringify(settings));}catch{toast('설정 저장 공간이 부족해요.');}}
function render(){
  const cat=categories.find(c=>c.id===category),shown=visibleWords();
  document.documentElement.lang=settings.lang;
  app.innerHTML=`<div class="shell"><header><a class="brand" href="./" aria-label="말랑말랑 처음으로"><img src="./icon.svg" alt=""/><span>말랑말랑<small>우리 아이 첫 단어 친구</small></span></a><div class="top-actions"><div class="language" aria-label="언어 선택"><button data-lang="ko" class="${settings.lang==='ko'?'active':''}" aria-pressed="${settings.lang==='ko'}">한국어</button><button data-lang="en" class="${settings.lang==='en'?'active':''}" aria-pressed="${settings.lang==='en'}">English</button></div><button class="settings-button" id="settings" aria-label="보호자 설정">${icons.gear}<span>보호자</span></button></div></header>
  <main><section class="intro"><div><p class="eyebrow">작은 손으로, 넓은 세상을</p><h1>톡! 누르면 <span>말해 줘요</span><i>✦</i></h1><p>${cat.subtitle}</p></div><div class="voice-pill">${icons.sound}<span>${settings.voice==='ai'?'AI 목소리':settings.voice==='mom'?'가족 목소리 우선':'아이 목소리 우선'}<small>녹음이 없으면 AI 목소리로</small></span><b class="green-dot"></b></div></section>
  <nav class="tabs" aria-label="단어 종류">${categories.map(c=>`<button data-category="${c.id}" class="tab ${category===c.id?'active':''}" aria-pressed="${category===c.id}" style="--tab-color:${c.color}"><span class="tab-icon">${c.icon}</span>${settings.lang==='ko'?c.label:c.en}<small>${words.filter(w=>w.category===c.id).length}</small></button>`).join('')}</nav>
  <section class="play-area" aria-label="${cat.label} 스티커"><div class="section-heading"><h2>${cat.icon} ${settings.lang==='ko'?cat.label:cat.en} <span>친구들</span></h2><div class="mode-switch"><button id="listen-mode" aria-pressed="${!gameMode}">톡톡 듣기</button><button id="find-mode" aria-pressed="${gameMode}">🔎 찾기 놀이</button></div></div>
  ${gameMode?`<div class="game-bar"><div><strong id="game-question">${target?question(target,settings.lang).text:''}</strong><span id="game-feedback" role="status">${settings.lang==='ko'?'어디에 있을까요?':'Where is it?'}</span></div><button id="repeat-question" aria-label="문제 다시 듣기">${icons.sound}<span>다시 듣기</span></button></div>`:''}
  <div class="cards">${shown.map((w,i)=>`<button class="word-card color-${i%6}" data-word="${w.id}" aria-label="${w[settings.lang]} ${gameMode?'선택':'듣기'}">${sticker(w)}${settings.labels?`<strong>${w.category==='hangul'?w.ko:w[settings.lang]}</strong><span class="translation">${w.category==='hangul'?(settings.lang==='en'?w.en:'소리 내어 읽어요'):w[settings.lang==='ko'?'en':'ko']}</span>`:''}<span class="sound-badge">${icons.sound}</span></button>`).join('')}</div>
  ${tabletQuery.matches?'':`<div class="pagination"><button class="page-arrow" id="previous" aria-label="이전 단어" ${page===0?'disabled':''}>←</button><div class="page-dots" aria-label="페이지">${Array.from({length:5},(_,i)=>`<button data-page="${i}" aria-label="${i+1}페이지" aria-current="${page===i?'page':'false'}" class="${page===i?'current':''}"></button>`).join('')}</div><span>${page+1} / 5</span><button class="page-arrow" id="next" aria-label="다음 단어" ${page===4?'disabled':''}>→</button></div>`}</section>
  <footer><span class="footer-note">♡ 함께 듣고, 함께 따라 해요</span><span id="now-playing" aria-live="polite">${category==='hangul'?'한글은 영어 모드에서도 한국어로 읽어요.':'하나씩 천천히, 우리 아이의 속도로'}</span></footer></main></div>`;
  app.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{resetRound();settings.lang=b.dataset.lang;persist();if(gameMode)newRound();else render();});
  app.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{resetRound();category=b.dataset.category;page=0;if(gameMode)newRound();else render();});
  app.querySelectorAll('[data-word]').forEach(b=>b.onclick=()=>chooseWord(words.find(w=>w.id===b.dataset.word),b));
  app.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>changePage(Number(b.dataset.page)));
  if(!tabletQuery.matches){document.querySelector('#previous').onclick=()=>changePage(page-1);document.querySelector('#next').onclick=()=>changePage(page+1);}
  document.querySelector('#listen-mode').onclick=()=>{resetRound();gameMode=false;render();};
  document.querySelector('#find-mode').onclick=()=>{resetRound();gameMode=true;newRound();};
  const repeat=document.querySelector('#repeat-question');if(repeat)repeat.onclick=()=>{if(solved)newRound();else sayPrompt(question(target,settings.lang));};
  document.querySelector('#settings').onclick=openGate;
}
function changePage(next){resetRound();page=Math.max(0,Math.min(4,next));if(gameMode)newRound();else render();}
async function playWord(word,button){
  selected=word.id;document.querySelectorAll('.word-card').forEach(c=>c.classList.remove('speaking'));button.classList.add('speaking');
  clearTimeout(highlightTimer);highlightTimer=setTimeout(()=>button.classList.remove('speaking'),1800);
  try{await speak(word,settings,source=>{if(selected===word.id){const el=document.querySelector('#now-playing');if(el)el.textContent=`${word[settings.lang]} · ${source}`;}});}catch{toast('소리가 재생되지 않았어요. 기기의 음량과 음성 설정을 확인해 주세요.');}
}
function showModal(html){modal.innerHTML=html;if(!modal.open)modal.showModal();}
function modalHeader(title,sub=''){return `<div class="modal-head"><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div><button class="close" id="close-modal" aria-label="닫기">✕</button></div>`;}
function closeModal(){cleanupRecording();stopAudio();modal.close();render();}
function wireClose(){document.querySelector('#close-modal').onclick=closeModal;}
modal.addEventListener('cancel',event=>{event.preventDefault();closeModal();});
function openGate(){
  cancelRound();gameMode=false;const a=3+Math.floor(Math.random()*6),b=2+Math.floor(Math.random()*7);
  showModal(`${modalHeader('보호자와 함께 열어요','설정과 녹음은 어른과 함께해요.')}<form id="gate"><label class="gate-label" for="answer">${a} + ${b} = ?</label><input id="answer" type="number" inputmode="numeric" autocomplete="off" placeholder="정답" required/><p id="gate-error" role="alert"></p><button class="primary" type="submit">설정 열기</button></form>`);wireClose();
  document.querySelector('#gate').onsubmit=e=>{e.preventDefault();if(Number(document.querySelector('#answer').value)===a+b)openSettings();else document.querySelector('#gate-error').textContent='다시 계산해 주세요.';};
}
function openSettings(){
  cleanupRecording();stopAudio();
  showModal(`${modalHeader('우리 가족의 단어놀이','아이에게 익숙한 목소리로, 더 다정하게.')}<div class="setting-section"><h3>어떤 목소리로 들을까요?</h3><div class="voice-options">${[['mom','♡','가족 목소리'],['child','☺','아이 목소리'],['ai','✦','AI 목소리']].map(([v,icon,label])=>`<button data-voice="${v}" class="option ${settings.voice===v?'chosen':''}" aria-pressed="${settings.voice===v}"><b>${icon}</b>${label}</button>`).join('')}</div><p class="help">녹음한 단어가 없으면 AI 음성이 나와요. AI 음성을 사용할 수 없으면 기기 기본 음성을 사용해요.</p></div>
  <button class="record-entry" id="record-mode">${icons.mic}<span><strong>우리 목소리 녹음하기</strong><small>엄마, 아빠, 아이가 직접 들려주는 단어</small></span><b>→</b></button>
  <div class="setting-row"><label for="rate">AI 음성 속도</label><select id="rate"><option value="0.8">천천히</option><option value="0.9">조금 천천히</option><option value="1">보통</option></select></div>
  <div class="setting-row"><label for="labels">그림 아래 단어 보기</label><input id="labels" type="checkbox" ${settings.labels?'checked':''}/></div>
  <div class="setting-section"><h3>녹음 보관하기</h3><p class="help">녹음은 이 기기에만 저장돼요. 앱 삭제나 브라우저 데이터 삭제 전에 파일로 보관해 주세요. 다른 기기로 자동 전송되지 않아요.</p><div class="button-row"><button class="secondary" id="export">녹음 내보내기</button><button class="secondary" id="import">녹음 가져오기</button></div><input hidden id="backup-file" type="file" accept="application/json,.json"/></div>
  <div class="setting-section install-section"><h3>앱으로 사용하기</h3><p class="help">${Capacitor.isNativePlatform()?'안드로이드 앱으로 실행 중이에요.':'갤럭시 Chrome 메뉴에서 “홈 화면에 추가” 또는 “앱 설치”를 선택하세요. 처음에는 인터넷에 연결해 주세요.'}</p>${installPrompt?'<button class="secondary" id="install">앱 설치하기</button>':''}<p class="privacy-note">로그인·광고·추적 없이 이용해요.<br/>사진 스티커와 기본 음성은 AI로 만들어졌어요. v1.2.1</p></div>`);wireClose();
  document.querySelectorAll('[data-voice]').forEach(b=>b.onclick=()=>{settings.voice=b.dataset.voice;persist();openSettings();});
  const rate=document.querySelector('#rate');rate.value=settings.rate;rate.onchange=()=>{settings.rate=Number(rate.value);persist();};
  document.querySelector('#labels').onchange=e=>{settings.labels=e.target.checked;persist();};
  document.querySelector('#record-mode').onclick=()=>openRecording();
  document.querySelector('#export').onclick=exportBackup;document.querySelector('#import').onclick=()=>document.querySelector('#backup-file').click();
  document.querySelector('#backup-file').onchange=e=>importBackup(e.target.files[0]);
  const install=document.querySelector('#install');if(install)install.onclick=async()=>{await installPrompt.prompt();installPrompt=null;openSettings();};
}
async function openRecording(context={category,wordId:words.find(w=>w.category===category).id,lang:settings.lang,person:settings.voice==='child'?'child':'mom'}) {
  cleanupRecording();stopAudio();recordContext={...context};draft=null;
  const items=words.filter(w=>w.category===context.category),word=items.find(w=>w.id===context.wordId)||items[0];recordContext.wordId=word.id;
  showModal(`${modalHeader('우리 목소리 녹음실','단어마다, 언어마다 따로 녹음할 수 있어요.')}<div class="record-selects"><label>목소리<select id="record-person"><option value="mom">가족 목소리</option><option value="child">아이 목소리</option></select></label><label>언어<select id="record-lang"><option value="ko">한국어</option><option value="en">English</option></select></label><label>종류<select id="record-category">${categories.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}</select></label></div>
  <label class="word-select-label">녹음할 단어<select id="record-word">${items.map(w=>`<option value="${w.id}">${w.ko} · ${w.en}</option>`).join('')}</select></label>
  <div class="record-word">${sticker(word)}<strong>${word.category==='hangul'?word.ko:word[context.lang]}</strong><span>${word.category==='hangul'?'한글은 한국어 발음으로 녹음해 주세요.':'조용한 곳에서 또박또박 말해 주세요.'}</span></div>
  <p id="record-status" class="record-status" role="status">저장된 녹음 확인 중…</p>
  <div class="mic-panel"><strong>마이크 사용 준비</strong><p id="mic-status" role="status">권한 확인 중…</p><div class="button-row"><button class="secondary" id="mic-permission">마이크 권한 허용하기</button><button class="secondary" id="mic-settings">${isAndroidApp()?'앱 권한 설정 열기':'권한 설정 방법 보기'}</button></div><p class="help" id="mic-help" hidden>${isAndroidApp()?'설정에서 권한 → 마이크 → 앱 사용 중에만 허용을 선택한 뒤 돌아와 주세요.':'주소창 왼쪽 사이트 정보(조절 아이콘/자물쇠) → 권한 또는 사이트 설정 → 마이크 → 허용을 선택하세요. 브라우저 자체의 마이크 권한도 꺼져 있다면 기기 설정 → 앱 → 사용 중인 브라우저 → 권한에서 허용해 주세요.'}</p></div>
  <div class="button-row"><button class="record-main" id="record-start">${icons.mic} 녹음 시작</button><button class="secondary" id="record-stop" disabled>녹음 끝내기</button></div>
  <div class="button-row draft-controls"><button class="secondary" id="preview-draft" disabled>방금 녹음 듣기</button><button class="primary" id="save-record" disabled>이 목소리 저장</button></div>
  <div class="saved-controls"><button class="text-button" id="play-saved" disabled>저장된 목소리 듣기</button><button class="text-button danger" id="delete-saved" disabled>저장된 녹음 삭제</button></div>
  <p class="help center">최대 10초 · 저장 버튼을 눌러야 보관돼요.<br/>마이크는 녹음 중에만 사용해요.</p><button class="secondary full" id="back-settings">← 설정으로</button>`);wireClose();
  for(const [id,key] of [['record-person','person'],['record-lang','lang'],['record-category','category'],['record-word','wordId']]){
    const el=document.getElementById(id);el.value=recordContext[key];el.onchange=()=>openRecording({...recordContext,[key]:el.value});
  }
  document.querySelector('#back-settings').onclick=openSettings;
  document.querySelector('#record-start').onclick=startRecording;document.querySelector('#record-stop').onclick=()=>finishRecording();
  document.querySelector('#mic-permission').onclick=prepareMicrophone;
  document.querySelector('#mic-settings').onclick=async()=>{document.querySelector('#mic-help').hidden=false;if(isAndroidApp())try{await openMicrophoneSettings();}catch(error){toast(error.message);}};
  refreshMicrophone();
  document.querySelector('#preview-draft').onclick=()=>playBlob(draft).catch(()=>toast('녹음을 재생할 수 없어요. 다시 녹음해 주세요.'));
  document.querySelector('#save-record').onclick=saveDraft;
  const generation=recordingGeneration,key=recordingKey(word.id,context.lang,context.person);
  try{
    const saved=await getRecording(key);if(generation!==recordingGeneration)return;
    document.querySelector('#record-status').textContent=saved?'이 단어에 저장된 목소리가 있어요.':'아직 녹음한 목소리가 없어요.';
    const play=document.querySelector('#play-saved'),del=document.querySelector('#delete-saved');play.disabled=del.disabled=!saved;
    play.onclick=()=>playBlob(saved.blob).catch(()=>toast('저장된 녹음을 재생할 수 없어요.'));
    del.onclick=async()=>{if(!confirm('이 단어의 저장된 녹음을 삭제할까요?'))return;try{await deleteRecording(key);toast('녹음을 삭제했어요.');openRecording({...recordContext});}catch{toast('삭제하지 못했어요. 다시 시도해 주세요.');}};
  }catch{document.querySelector('#record-status').textContent='저장 공간을 사용할 수 없어요. 일반 브라우저 모드에서 다시 열어 주세요.';document.querySelector('#record-start').disabled=true;}
}
function cleanupRecording(){
  recordingGeneration++;clearInterval(recordingTimer);
  if(recorder&&recorder.state!=='inactive'){recorder.onstop=null;recorder.stop();}
  stream?.getTracks().forEach(track=>track.stop());stream=null;recorder=null;draft=null;
}
async function refreshMicrophone(){
  const el=document.querySelector('#mic-status'),generation=recordingGeneration;if(!el)return;
  try{
    const state=await microphoneStatus();if(generation!==recordingGeneration||!el.isConnected)return;
    el.textContent=state==='granted'?'마이크가 허용되어 있어요. 녹음을 시작할 수 있어요.':state==='denied'?'마이크가 차단되어 있어요. 권한 설정에서 허용해 주세요.':state==='unsupported'?'마이크를 지원하는 앱 또는 HTTPS 브라우저에서 열어 주세요.':'아래 버튼을 누르고 권한 창에서 허용을 선택해 주세요.';
    document.querySelector('#mic-help').hidden=state!=='denied';
    document.querySelector('#mic-permission').textContent=state==='granted'?'마이크 연결 확인하기':'마이크 권한 허용하기';
  }catch{if(el.isConnected)el.textContent='아래 버튼으로 마이크 권한을 확인해 주세요.';}
}
async function prepareMicrophone(){
  const generation=recordingGeneration,el=document.querySelector('#mic-status');
  const controls=[...modal.querySelectorAll('button:not(#close-modal),select')].map(control=>[control,control.disabled]);
  controls.forEach(([control])=>control.disabled=true);el.textContent='권한 창에서 마이크 사용을 허용해 주세요.';
  try{
    const state=await requestMicrophone();if(generation!==recordingGeneration||!el.isConnected)return;
    if(state!=='granted')throw new DOMException('Denied','NotAllowedError');
    el.textContent='마이크가 허용됐어요! 녹음 시작을 눌러 주세요.';
    document.querySelector('#mic-help').hidden=true;
    document.querySelector('#mic-permission').textContent='마이크 연결 확인하기';
  }catch(error){
    if(generation!==recordingGeneration||!el.isConnected)return;
    const state=await microphoneStatus().catch(()=>'unknown');
    if(generation!==recordingGeneration||!el.isConnected)return;
    el.textContent=microphoneErrorMessage(error,state);
    document.querySelector('#mic-help').hidden=state==='granted';
  }finally{if(generation===recordingGeneration)controls.forEach(([control,disabled])=>{if(control.isConnected)control.disabled=disabled;});}
}
window.addEventListener('focus',refreshMicrophone);
watchMicrophoneStatus(refreshMicrophone);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshMicrophone();});
function recordBusy(busy){
  modal.querySelectorAll('select, #back-settings, #play-saved, #delete-saved, #preview-draft, #save-record, #mic-permission, #mic-settings').forEach(el=>el.disabled=busy);
  document.querySelector('#record-start').disabled=busy;document.querySelector('#record-stop').disabled=!busy;
}
async function startRecording(){
  stopAudio();draft=null;const generation=++recordingGeneration;
  if(!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder){toast('마이크 녹음을 지원하는 Chrome 또는 안드로이드 앱에서 열어 주세요.');return;}
  recordBusy(true);document.querySelector('#record-status').textContent='마이크 사용을 허용해 주세요.';
  try{
    if(isAndroidApp()&&await requestMicrophone({verify:false})!=='granted')throw new DOMException('마이크 권한이 필요해요.','NotAllowedError');
    if(generation!==recordingGeneration)return;
    const acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
    if(generation!==recordingGeneration){acquired.getTracks().forEach(t=>t.stop());return;}
    stream=acquired;
    document.querySelector('#mic-status').textContent='마이크가 연결됐어요.';document.querySelector('#mic-help').hidden=true;
    const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
    recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{});const chunks=[];
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>{cleanupRecording();toast('녹음이 중단됐어요. 다시 시작해 주세요.');openRecording({...recordContext});};
    recorder.onstop=()=>{
      clearInterval(recordingTimer);stream?.getTracks().forEach(t=>t.stop());stream=null;
      if(generation!==recordingGeneration)return;
      draft=new Blob(chunks,{type:recorder.mimeType || mime || 'audio/webm'});recorder=null;
      recordBusy(false);document.querySelector('#play-saved').disabled=true;document.querySelector('#delete-saved').disabled=true;
      document.querySelector('#record-status').textContent=draft.size?'녹음을 듣고, 마음에 들면 저장해 주세요.':'소리가 담기지 않았어요. 다시 녹음해 주세요.';
      document.querySelector('#save-record').disabled=document.querySelector('#preview-draft').disabled=!draft.size;
    };
    recorder.start();let elapsed=0;document.querySelector('#record-status').textContent='● 녹음 중… 0 / 10초';
    recordingTimer=setInterval(()=>{elapsed++;document.querySelector('#record-status').textContent=`● 녹음 중… ${elapsed} / 10초`;if(elapsed>=10)finishRecording();},1000);
  }catch(error){
    if(generation!==recordingGeneration)return;
    cleanupRecording();await openRecording({...recordContext});
    const statusElement=document.querySelector('#mic-status'),state=await microphoneStatus().catch(()=>'unknown');
    if(statusElement?.isConnected){statusElement.textContent=microphoneErrorMessage(error,state);document.querySelector('#mic-help').hidden=state==='granted';}
    toast(microphoneErrorMessage(error,state));
  }
}
function finishRecording(){if(recorder?.state==='recording'){document.querySelector('#record-stop').disabled=true;recorder.stop();}}
async function saveDraft(){
  if(!draft?.size)return;const context={...recordContext},blob=draft;
  document.querySelector('#save-record').disabled=true;
  try{await saveRecordings([{key:recordingKey(context.wordId,context.lang,context.person),blob,updatedAt:new Date().toISOString()}]);navigator.storage?.persist?.().catch(()=>{});toast('목소리를 저장했어요!');await openRecording(context);}catch{toast('저장하지 못했어요. 기기의 남은 공간을 확인해 주세요.');const b=document.querySelector('#save-record');if(b)b.disabled=false;}
}
async function exportBackup(){
  try{
    const records=await allRecordings();if(!records.length){toast('내보낼 녹음이 아직 없어요.');return;}
    const converted=await Promise.all(records.map(async r=>({key:r.key,updatedAt:r.updatedAt,type:r.blob.type,data:await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(r.blob);})})));
    const content=JSON.stringify({app:'malang-word-play',version:1,records:converted}),filename=`말랑말랑-녹음-${new Date().toISOString().slice(0,10)}.json`;
    if(Capacitor.isNativePlatform()) {const result=await BackupFiles.exportFile({content,filename});toast(result.saved?'녹음 파일을 내보냈어요.':'내보내기를 취소했어요.');return;}
    const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('녹음 파일을 내보냈어요. 다운로드 폴더를 확인해 주세요.');
  }catch{toast('내보내지 못했어요. 저장 공간을 확인해 주세요.');}
}
async function importBackup(file){
  if(!file)return;
  try{
    if(file.size>50*1024*1024)throw new Error('파일이 너무 커요. 최대 50MB까지 가져올 수 있어요.');
    const backup=JSON.parse(await file.text());
    if(backup.app!=='malang-word-play'||backup.version!==1||!Array.isArray(backup.records)||backup.records.length>words.length*4)throw new Error('말랑말랑 녹음 파일이 아니에요.');
    const validKeys=new Set(words.flatMap(w=>['ko','en'].flatMap(l=>['mom','child'].map(p=>recordingKey(w.id,l,p)))));
    const seen=new Set();
    const records=backup.records.map(r=>{
      if(!validKeys.has(r.key)||seen.has(r.key)||typeof r.data!=='string'||r.data.length>2*1024*1024||!/^audio\/(webm|mp4|ogg|mpeg|wav)(;codecs=[a-z0-9.-]+)?$/i.test(r.type))throw new Error('녹음 파일 내용이 올바르지 않아요.');
      seen.add(r.key);const bytes=Uint8Array.from(atob(r.data),c=>c.charCodeAt(0));if(!bytes.length)throw new Error('빈 녹음이 있어요.');return {key:r.key,blob:new Blob([bytes],{type:r.type}),updatedAt:new Date().toISOString()};
    });
    if(!records.length){toast('가져올 녹음이 없어요.');return;}
    if(!confirm(`${records.length}개의 녹음을 가져올까요? 같은 단어·언어·목소리의 기존 녹음은 바뀝니다.`))return;
    await saveRecordings(records);toast(`${records.length}개의 녹음을 가져왔어요.`);
  }catch(error){toast(error instanceof SyntaxError?'읽을 수 없는 파일이에요.':error.message || '녹음을 가져오지 못했어요.');}
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelRound();if(recorder?.state==='recording')finishRecording();}else if(gameMode&&!modal.open){newRound();}});
window.addEventListener('pagehide',()=>{cleanupRecording();stopAudio();});
render();
if('serviceWorker' in navigator && !import.meta.env.DEV && !Capacitor.isNativePlatform()) navigator.serviceWorker.register('./sw.js').catch(()=>toast('오프라인 저장을 완료하지 못했어요. 인터넷 연결 상태에서 다시 열어 주세요.'));
