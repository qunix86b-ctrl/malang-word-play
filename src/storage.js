let database;
export const recordingKey = (id, lang, person) => `${id}:${lang}:${person}`;
export function openDatabase() {
  if (database) return database;
  database = new Promise((resolve,reject)=>{
    const request = indexedDB.open('malang-voices', 1);
    request.onupgradeneeded = ()=>request.result.createObjectStore('recordings',{keyPath:'key'});
    request.onsuccess = ()=>resolve(request.result);
    request.onerror = ()=>reject(request.error);
  }).catch(error=>{database=null;throw error;});
  return database;
}
export async function getRecording(key) {
  const db = await openDatabase();
  return new Promise((resolve,reject)=>{
    const req=db.transaction('recordings').objectStore('recordings').get(key);
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
export async function allRecordings() {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const req=db.transaction('recordings').objectStore('recordings').getAll();
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
export async function saveRecordings(records) {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('recordings','readwrite');
    for(const record of records) tx.objectStore('recordings').put(record);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error || new Error('저장 취소'));
  });
}
export async function deleteRecording(key) {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('recordings','readwrite');tx.objectStore('recordings').delete(key);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
}
