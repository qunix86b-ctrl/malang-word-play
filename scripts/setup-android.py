"""Project-local build tools; does not change system Java or Android settings."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request
import zipfile
import json
import hashlib

ROOT = Path(__file__).resolve().parents[1] / '.tools'
ROOT.mkdir(exist_ok=True)

def download_java():
    url = 'https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip'
    path = ROOT / 'jdk.zip'
    if not path.exists():
        urllib.request.urlretrieve(url, path)
    with zipfile.ZipFile(path) as archive:
        archive.extractall(ROOT / 'java')
    print('Java 21 ready', flush=True)

def download_android():
    path = ROOT / 'android-tools.zip'
    if not path.exists():
        urllib.request.urlretrieve('https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip', path)
    with zipfile.ZipFile(path) as archive:
        archive.extractall(ROOT / 'android-download')
    source = ROOT / 'android-download/cmdline-tools'
    destination = ROOT / 'android-sdk/cmdline-tools/latest'
    if not destination.exists():
        destination.parent.mkdir(parents=True, exist_ok=True)
        source.rename(destination)
    print('Android command-line tools ready', flush=True)

with ThreadPoolExecutor(max_workers=2) as pool:
    list(pool.map(lambda fn: fn(), [download_java, download_android]))
