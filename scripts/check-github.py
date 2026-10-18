"""Check configured GitHub authentication without printing credentials."""
import subprocess, os, urllib.request, json
env = dict(os.environ, GIT_TERMINAL_PROMPT='0', GCM_INTERACTIVE='never')
result = subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,env=env)
if result.returncode:
    print('No noninteractive GitHub credential available.')
    raise SystemExit(1)
fields = dict(line.split('=',1) for line in result.stdout.splitlines() if '=' in line)
token = fields.get('password','')
req=urllib.request.Request('https://api.github.com/user',headers={'Authorization':f'Bearer {token}','Accept':'application/vnd.github+json','User-Agent':'malang-word-play'})
try:
    with urllib.request.urlopen(req) as response:
        data=json.load(response)
        print(json.dumps({'login':data['login'],'html_url':data['html_url']}))
except urllib.error.HTTPError as error:
    print(f'GitHub authentication check failed: HTTP {error.code}')
    raise SystemExit(1)
