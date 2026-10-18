"""Publish this app to its authorized GitHub repository using Git Credential Manager."""
from pathlib import Path
import subprocess, json, os, urllib.request, urllib.error
root=Path(__file__).resolve().parents[1]
os.chdir(root)
repo=json.loads((root/'.tools/github-repo.json').read_text(encoding='utf-8'))
env=dict(os.environ,GIT_TERMINAL_PROMPT='0',GCM_INTERACTIVE='never')
def git(*args):subprocess.run(['git',*args],check=True,env=env)
if not (root/'.git').exists():
    git('init','-b','main')
    git('config','user.name',repo['owner'])
    git('config','user.email',f'{repo["user_id"]}+{repo["owner"]}@users.noreply.github.com')
    git('remote','add','origin',repo['url']+'.git')
git('add','.')
files=subprocess.run(['git','diff','--cached','--name-only'],capture_output=True,text=True,check=True).stdout.splitlines()
for path in files:
    if any(part in path.split('/') for part in ['.tools','.venv','node_modules']) or path.endswith(('.jks','.keystore')):
        raise RuntimeError('Private build files must not be published')
if files:git('commit','-m','Build bilingual toddler word play with offline voices and family recordings')
git('push','-u','origin','main')
credential=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,env=env,check=True)
token=dict(line.split('=',1) for line in credential.stdout.splitlines() if '=' in line)['password']
url=f'https://api.github.com/repos/{repo["owner"]}/{repo["name"]}/pages'
headers={'Authorization':f'Bearer {token}','Accept':'application/vnd.github+json','User-Agent':'malang-word-play','Content-Type':'application/json'}
try:
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers)) as response:page=json.load(response)
except urllib.error.HTTPError as error:
    if error.code!=404:raise
    with urllib.request.urlopen(urllib.request.Request(url,data=json.dumps({'build_type':'workflow'}).encode(),headers=headers,method='POST')) as response:page=json.load(response)
print('Pages configured:',page.get('html_url'))
