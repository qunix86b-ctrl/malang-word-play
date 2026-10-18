"""Generate bundled neural voices. Only the fixed word list is sent to the TTS service.
Run: node scripts/export-words.mjs && .venv/Scripts/python scripts/generate-audio.py
Requires edge-tts==7.3.1. Runtime playback needs no cloud account or API key.
"""
import asyncio
import json
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
VOICES = {'ko': 'ko-KR-SunHiNeural', 'en': 'en-US-JennyNeural'}

async def main():
    words = json.loads((ROOT / 'scripts/words.json').read_text(encoding='utf-8'))
    tasks = [(w, lang) for w in words for lang in ('ko', 'en') if not (w['category'] == 'hangul' and lang == 'en')]
    semaphore = asyncio.Semaphore(4)
    completed = 0
    failures = []

    async def generate(word, language):
        nonlocal completed
        path = ROOT / 'public/audio' / language / (word['id'] + '.mp3')
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and path.stat().st_size > 1000:
            completed += 1
            return
        async with semaphore:
            for attempt in range(3):
                try:
                    await asyncio.wait_for(edge_tts.Communicate(word[language], VOICES[language], rate='-5%').save(str(path)), timeout=45)
                    if path.stat().st_size < 1000:
                        raise RuntimeError('Empty audio')
                    completed += 1
                    if completed % 15 == 0:
                        print(f'Audio ready: {completed}/{len(tasks)}', flush=True)
                    return
                except Exception as error:
                    if attempt == 2:
                        failures.append(f'{word["id"]}/{language}: {type(error).__name__}')
                    else:
                        await asyncio.sleep(2 * (attempt + 1))

    await asyncio.gather(*(generate(w, lang) for w, lang in tasks))
    print(f'Audio complete: {completed}/{len(tasks)}; failures: {len(failures)}', flush=True)
    if failures:
        print('\n'.join(failures))
        raise SystemExit(1)

asyncio.run(main())
