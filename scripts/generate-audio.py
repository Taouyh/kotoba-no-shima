"""Build-time audio generation only. No synthesis engine is shipped to players."""
from array import array
import hashlib
import io
import json
from pathlib import Path
import time
import wave

import lameenc
from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

root = Path(__file__).resolve().parents[1]
work = root / "work/audio-build"
core = work / "voicevox"
targets = json.loads((work / "corpus.json").read_text(encoding="utf-8"))
model_path = core / "models/vvms/0.vvm"
settings = {"core": "0.17.1", "model_sha256": hashlib.sha256(model_path.read_bytes()).hexdigest(), "style": 2, "speed": 0.9, "bitrate": 48, "pre": 0.08, "post": 0.12}
output = root / "public/audio/v1"
output.mkdir(parents=True, exist_ok=True)
cache_file = work / "clip-meta.json"
cache = json.loads(cache_file.read_text(encoding="utf-8")) if cache_file.exists() else {}
ort = Onnxruntime.load_once(filename=str(core / "onnxruntime/lib/voicevox_onnxruntime.dll"))
synth = Synthesizer(ort, OpenJtalk(str(core / "dict/open_jtalk_dic_utf_8-1.11")), acceleration_mode="CPU", cpu_num_threads=4)
with VoiceModelFile.open(str(model_path)) as model:
    synth.load_voice_model(model)

files = {}
started = time.monotonic()
unique = list(dict.fromkeys(target["speech"] for target in targets))
for index, speech in enumerate(unique, 1):
    key = hashlib.sha256(json.dumps([settings, speech], ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:20]
    path = output / (key + ".mp3")
    if not path.exists() or key not in cache:
        query = synth.create_audio_query(speech, 2)
        if not query.accent_phrases:
            raise ValueError("No phonemes for " + repr(speech))
        query.speed_scale = settings["speed"]
        query.pre_phoneme_length = settings["pre"]
        query.post_phoneme_length = settings["post"]
        wav_bytes = synth.synthesis(query, 2)
        with wave.open(io.BytesIO(wav_bytes), "rb") as wav:
            assert wav.getnchannels() == 1 and wav.getsampwidth() == 2
            rate = wav.getframerate()
            frames = wav.getnframes()
            pcm = wav.readframes(frames)
        assert max(abs(sample) for sample in array("h", pcm)) > 64, speech
        assert 0.15 <= frames / rate < 30, speech
        encoder = lameenc.Encoder()
        encoder.set_bit_rate(settings["bitrate"])
        encoder.set_in_sample_rate(rate)
        encoder.set_channels(1)
        encoder.set_quality(2)
        encoded = bytes(encoder.encode(pcm)) + bytes(encoder.flush())
        assert len(encoded) > 256
        path.write_bytes(encoded)
        cache[key] = {"file": f"audio/v1/{key}.mp3", "speech": speech, "kana": query.kana, "duration": round(frames / rate, 4), "bytes": len(encoded), "sha256": hashlib.sha256(encoded).hexdigest()}
    files[speech] = cache[key]["file"]
    if index % 25 == 0 or index == len(unique):
        cache_file.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Audio {index}/{len(unique)}, elapsed {time.monotonic() - started:.1f}s", flush=True)

manifest = {"credit": "VOICEVOX:四国めたん", "format": "mp3", "files": {target["id"]: files[target["speech"]] for target in targets}}
(root / "src/data/audio-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
used = {Path(file).stem for file in files.values()}
index_data = {"settings": settings, "clips": [cache[key] for key in sorted(used)]}
(root / "docs/audio-index.json").write_text(json.dumps(index_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"targets": len(targets), "clips": len(used), "audioBytes": sum(cache[key]["bytes"] for key in used), "durationSeconds": round(sum(cache[key]["duration"] for key in used), 1)}, ensure_ascii=False), flush=True)
