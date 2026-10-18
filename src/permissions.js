import { Capacitor, registerPlugin } from '@capacitor/core';
const MicrophoneAccess=registerPlugin('MicrophoneAccess');
export const isAndroidApp=()=>Capacitor.isNativePlatform();
export async function microphoneStatus(){
  if(isAndroidApp())return (await MicrophoneAccess.status()).state;
  if(!navigator.mediaDevices?.getUserMedia)return 'unsupported';
  try{return (await navigator.permissions.query({name:'microphone'})).state;}catch{return 'prompt';}
}
export async function requestMicrophone(){
  if(isAndroidApp())return (await MicrophoneAccess.requestAccess()).state;
  const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
  stream.getTracks().forEach(track=>track.stop());return 'granted';
}
export async function openMicrophoneSettings(){await MicrophoneAccess.openSettings();}
