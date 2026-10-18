import { readdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(dir){const list=[];for(const e of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${e.name}`;if(e.isDirectory())list.push(...await walk(path));else if(e.name!=='sw.js')list.push(path);}return list;}
const files=await walk('dist');const hash=createHash('sha256');for(const f of files)hash.update(await readFile(f));
const version=hash.digest('hex').slice(0,12),urls=['./',...files.map(f=>'./'+f.slice(5))];
await writeFile('dist/sw.js',`const CACHE='malang-${version}';
const FILES=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES);})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('malang-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const hit=await cache.match(event.request,{ignoreVary:true});if(hit)return hit;try{return await fetch(event.request);}catch(error){if(event.request.mode==='navigate')return await cache.match('./index.html',{ignoreVary:true});throw error;}})());});
`);
console.log(`Offline cache: ${urls.length} files, version ${version}`);
