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
body='''## 말랑말랑 단어놀이 1.1.0

패드 30개 한 화면 보기와 찾기 놀이를 추가한 업데이트입니다.

- 패드에서 30개를 한 화면에 표시: 가로 6×5 / 세로 5×6, 페이지 이동 없음
- 찾기 놀이: 한국어·영어 문제 안내, 다시 듣기, 정답 칭찬, 자동 다음 문제
- 동물·과일/채소·물건·숫자·한글, 총 150개 항목
- 사진 스타일 AI 누끼 스티커 90개
- 한국어·영어 AI 음성 270개, 오프라인 사용
- 가족/아이 목소리 녹음, 단어·언어별 저장, 백업·복원

기존 앱을 삭제하지 않고 새 APK를 설치하면 같은 서명으로 업데이트하며 저장된 녹음을 유지합니다.

**설치:** 아래 `malang-word-play.apk`를 내려받아 열어 주세요. Android 7 이상에서 사용합니다. Android가 요청하면 해당 다운로드 앱의 ‘이 출처 허용’을 켜 주세요.

**웹 실행:** https://qunix86b-ctrl.github.io/malang-word-play/

서명된 release APK 빌드 및 브라우저 자동 검증을 통과했습니다. 갤럭시 실물 기기에서는 아직 직접 검증하지 않았습니다. 녹음은 기기에만 저장되므로 앱 삭제 전에 녹음 내보내기를 사용하세요.

웹 ZIP은 HTTPS 웹 서버에 올려 사용하는 파일입니다. 파일을 직접 더블클릭하는 방식은 지원하지 않습니다.
'''
try:
    with urllib.request.urlopen(urllib.request.Request(base+'/releases/tags/v1.1.0',headers=headers)) as response:release=json.load(response)
except urllib.error.HTTPError as error:
    if error.code!=404:raise
    payload={'tag_name':'v1.1.0','target_commitish':'main','name':'말랑말랑 단어놀이 v1.1.0','body':body,'draft':False,'prerelease':False}
    with urllib.request.urlopen(urllib.request.Request(base+'/releases',data=json.dumps(payload).encode(),headers={**headers,'Content-Type':'application/json'},method='POST')) as response:release=json.load(response)
existing={a['name'] for a in release['assets']}
for name,mime in [('malang-word-play.apk','application/vnd.android.package-archive'),('SHA256SUMS.txt','text/plain'),('malang-word-play-web.zip','application/zip')]:
    if name in existing:raise RuntimeError(f'Asset already exists; do not overwrite a public release automatically: {name}')
    upload=release['upload_url'].split('{')[0]+'?name='+name
    with urllib.request.urlopen(urllib.request.Request(upload,data=(root/'output'/name).read_bytes(),headers={**headers,'Content-Type':mime},method='POST')) as response:
        asset=json.load(response);print(asset['browser_download_url'])
print('Release:',release['html_url'])

