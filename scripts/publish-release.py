"""Upload the verified signed APK, checksum and web archive to GitHub Releases."""
from pathlib import Path
import json, os, subprocess, urllib.request, urllib.error, hashlib, zipfile
root=Path(__file__).resolve().parents[1]
os.chdir(root)
repo=json.loads((root/'.tools/github-repo.json').read_text(encoding='utf-8'))
apk=root/'output/malang-word-play.apk'
if not apk.exists():raise RuntimeError('Copy verified release APK to output first')
digest=hashlib.sha256(apk.read_bytes()).hexdigest()
(root/'output/SHA256SUMS.txt').write_text(f'{digest}  malang-word-play.apk\n',encoding='ascii')
with zipfile.ZipFile(root/'output/malang-word-play-web.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for path in (root/'dist').rglob('*'):
        if path.is_file():archive.write(path,path.relative_to(root/'dist'))
env=dict(os.environ,GIT_TERMINAL_PROMPT='0',GCM_INTERACTIVE='never')
credential=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,env=env,check=True)
token=dict(line.split('=',1) for line in credential.stdout.splitlines() if '=' in line)['password']
headers={'Authorization':f'Bearer {token}','Accept':'application/vnd.github+json','User-Agent':'malang-word-play'}
base=f'https://api.github.com/repos/{repo["owner"]}/{repo["name"]}'
version=json.loads((root/'package.json').read_text(encoding='utf-8-sig'))['version']
tag='v'+version
body=(root/f'docs/RELEASE-{version}.md').read_text(encoding='utf-8')

try:
    with urllib.request.urlopen(urllib.request.Request(base+'/releases/tags/'+tag,headers=headers)) as response:release=json.load(response)
except urllib.error.HTTPError as error:
    if error.code!=404:raise
    payload={'tag_name':tag,'target_commitish':'main','name':'말랑말랑 단어놀이 '+tag,'body':body,'draft':False,'prerelease':False}
    with urllib.request.urlopen(urllib.request.Request(base+'/releases',data=json.dumps(payload).encode(),headers={**headers,'Content-Type':'application/json'},method='POST')) as response:release=json.load(response)
existing={a['name'] for a in release['assets']}
for name,mime in [('malang-word-play.apk','application/vnd.android.package-archive'),('SHA256SUMS.txt','text/plain'),('malang-word-play-web.zip','application/zip')]:
    if name in existing:raise RuntimeError(f'Asset already exists; do not overwrite a public release automatically: {name}')
    upload=release['upload_url'].split('{')[0]+'?name='+name
    with urllib.request.urlopen(urllib.request.Request(upload,data=(root/'output'/name).read_bytes(),headers={**headers,'Content-Type':mime},method='POST')) as response:
        asset=json.load(response);print(asset['browser_download_url'])
print('Release:',release['html_url'])

