"""Create the authorized user's public app repository, using existing Git credentials."""
import json, os, subprocess, urllib.request, urllib.error
from pathlib import Path
env=dict(os.environ,GIT_TERMINAL_PROMPT='0',GCM_INTERACTIVE='never')
credential=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,env=env,check=True)
token=dict(line.split('=',1) for line in credential.stdout.splitlines() if '=' in line)['password']
def api(path,data=None,method=None):
    request=urllib.request.Request('https://api.github.com'+path,data=json.dumps(data).encode() if data is not None else None,method=method,headers={'Authorization':f'Bearer {token}','Accept':'application/vnd.github+json','User-Agent':'malang-word-play','Content-Type':'application/json'})
    with urllib.request.urlopen(request) as response:return json.load(response)
user=api('/user')
if user['login']!='qunix86b-ctrl':raise RuntimeError('Unexpected GitHub account')
name='malang-word-play'
try:
    repo=api(f'/repos/{user["login"]}/{name}')
    if repo.get('description')!='말랑말랑 단어놀이 · 아기를 위한 한국어/영어 사진 스티커와 가족 목소리 앱':raise RuntimeError('Repository name already exists. Choose a new name.')
except urllib.error.HTTPError as error:
    if error.code!=404:raise
    repo=api('/user/repos',{'name':name,'description':'말랑말랑 단어놀이 · 아기를 위한 한국어/영어 사진 스티커와 가족 목소리 앱','private':False,'has_issues':True,'auto_init':False})
Path('.tools/github-repo.json').write_text(json.dumps({'owner':user['login'],'name':name,'user_id':user['id'],'url':repo['html_url']}),encoding='utf-8')
print(repo['html_url'])
