"""Create a private local release signing key once. Never upload .tools/."""
from pathlib import Path
import os, secrets, subprocess
root=Path(__file__).resolve().parents[1]
key=root/'.tools/malang-release.jks'
config=root/'.tools/signing.properties'
if key.exists() or config.exists():
    if not (key.exists() and config.exists()):
        raise RuntimeError('Incomplete signing files; restore from backup rather than replacing the key.')
    print('Existing signing key retained.')
else:
    password=secrets.token_urlsafe(32)
    java=next((root/'.tools/java').glob('*/bin/keytool.exe'))
    subprocess.run([str(java),'-genkeypair','-keystore',str(key),'-alias','malang','-keyalg','RSA','-keysize','3072','-validity','10000','-storepass:env','MALANG_KEY_PASSWORD','-keypass:env','MALANG_KEY_PASSWORD','-dname','CN=Malang Word Play, O=Malang, C=KR'],env=dict(os.environ,MALANG_KEY_PASSWORD=password),check=True,capture_output=True)
    config.write_text(f'storePassword={password}\nkeyPassword={password}\n',encoding='ascii')
    print('Private signing key created in ignored .tools directory.')
