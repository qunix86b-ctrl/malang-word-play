import { Capacitor, registerPlugin } from '@capacitor/core';
import { getRecording, recordingKey } from './storage.js';
import { getSpeech } from './data.js';
const NativeSpeech=registerPlugin('NativeSpeech');
let sequence=0, audio, objectUrl;
export function stopAudio() {
  sequence++;
  if(audio) {audio.pause();audio.src='';audio=null;}
  if(objectUrl) {URL.revokeObjectURL(objectUrl);objectUrl=null;}
  globalThis.speechSynthesis?.cancel();
  if(Capacitor.isNativePlatform()) NativeSpeech.stop().catch(()=>{});
}
export async function playBlob(blob) {
  stopAudio();objectUrl=URL.createObjectURL(blob);audio=new Audio(objectUrl);await audio.play();
}
export async function speak(word,settings,onSource) {
  stopAudio(); const current=sequence;
  const {language,text}=getSpeech(word,settings.lang);
  if(settings.voice!=='ai') {
    try {
      const record=await getRecording(recordingKey(word.id,settings.lang,settings.voice));
      if(current!==sequence) return;
      if(record?.blob) {
        objectUrl=URL.createObjectURL(record.blob);audio=new Audio(objectUrl);
        await audio.play();onSource(settings.voice==='mom'?'가족 목소리':'아이 목소리');return;
      }
    } catch { if(current!==sequence)return; }
  }
  if(current!==sequence) return;
  try {
    audio=new Audio(`./audio/${language}/${word.id}.mp3`);
    audio.playbackRate=settings.rate;
    await audio.play();if(current===sequence)onSource('AI 목소리');return;
  } catch {if(current!==sequence)return;}
  if(Capacitor.isNativePlatform()) {
    await NativeSpeech.speak({text,language:language==='ko'?'ko-KR':'en-US',rate:settings.rate});
    if(current===sequence)onSource('기본 기기 목소리');return;
  }
  if(!globalThis.speechSynthesis) throw new Error('이 기기에서 음성을 재생할 수 없어요.');
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang=language==='ko'?'ko-KR':'en-US';utterance.rate=settings.rate;
  const voices=speechSynthesis.getVoices().filter(v=>v.lang.startsWith(language));
  utterance.voice=voices.find(v=>/Google|Natural|Online|SunHi|Jenny/i.test(v.name)) || voices[0] || null;
  speechSynthesis.speak(utterance);onSource('기본 기기 목소리');
}
