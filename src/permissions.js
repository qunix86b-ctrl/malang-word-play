import { Capacitor, registerPlugin } from '@capacitor/core';
const MicrophoneAccess=registerPlugin('MicrophoneAccess');
export const isAndroidApp=()=>Capacitor.isNativePlatform();
export async function microphoneStatus(){
  if(isAndroidApp())return (await MicrophoneAccess.status()).state;
  if(!navigator.mediaDevices?.getUserMedia)return 'unsupported';
  try{return (await navigator.permissions.query({name:'microphone'})).state;}catch{return 'prompt';}
}
export async function requestMicrophone({verify=true}={}){
  if(isAndroidApp()){
    const state=(await MicrophoneAccess.requestAccess()).state;
    if(state!=='granted'||!verify)return state;
  }
  const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
  stream.getTracks().forEach(track=>track.stop());return 'granted';
}
export async function openMicrophoneSettings(){await MicrophoneAccess.openSettings();}
export function watchMicrophoneStatus(callback){if(isAndroidApp())MicrophoneAccess.addListener('permissionStatusChanged',callback).catch(()=>{});}
export function microphoneErrorMessage(error,state){
  if(error.name==='NotAllowedError')return state==='granted'?'마이크 권한은 허용되어 있지만 녹음 연결이 차단됐어요. 앱을 완전히 닫고 다시 열어 주세요. 계속되면 기기의 마이크 사용 스위치를 확인해 주세요.':'마이크가 차단되어 있어요. 권한 설정에서 허용해 주세요.';
  if(error.name==='NotFoundError')return '연결된 마이크를 찾을 수 없어요. 마이크 연결을 확인해 주세요.';
  return '마이크를 사용할 수 없어요. 다른 녹음 앱을 닫고 기기의 마이크 사용 스위치를 확인해 주세요.';
}
