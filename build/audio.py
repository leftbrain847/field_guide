"""Record Listen mode's audio at build time: one MP3 per topic with every concept's summary, plus its marks.

    pip install -r build/requirements-audio.txt          # Kokoro (build time only; nothing ships in the page)
    python build/audio.py --models DIR [topic ...]       # DIR holds the voice in AUDIO["voice"] (see README)

Writes audio/summary/<topic>.mp3 and audio/summary/<topic>.json ({"hash", "file", "marks": [{ci, start, end}]}).
A topic is re-recorded only when its spoken text or AUDIO settings change (the hash). build.py inlines the marks;
the page plays audio/summary/<topic>.mp3 from each concept's start to its end, so it keeps playing in the
background and on the lock screen like any audio file.
"""
import hashlib, json, os, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from build import ORDER, TOPICS_DIR  # noqa: E402

AUDIO = {
    "engine": "kokoro",               # Kokoro-82M (Apache-2.0) via kokoro-onnx, the engine behind comprehensible_input's Santa
    "voice": "af_heart",              # Kokoro's top-graded English voice (A); see the voice samples in the PR
    "lang": "en-us",
    "model_files": ["kokoro-v1.0.onnx", "voices-v1.0.bin"],   # github.com/thewh1teagle/kokoro-onnx releases, model-files-v1.0
    "lead_in_s": 0.3,
    "gap_s": 1.0,                     # silence after each concept (the player stops inside it, so no clipped words)
    "level_rms_dbfs": -20,            # level each concept's speech (the engine can exceed full scale)
    "fade_in_s": 0.03, "fade_out_s": 0.05,
    "bitrate_kbps": 48, "sample_rate": 24000,   # Kokoro's native rate
    "out_dir": os.path.join(ROOT, "audio", "summary"),
}


def summary_text(c):
    """Must match build/listen.js conceptText(c, "summary")."""
    return (c["n"] + ". " + c["s"]).replace("..", ".")


def topic_hash(t):
    spoken = [summary_text(c) for c in t["concepts"]]
    return hashlib.sha256(json.dumps([spoken, AUDIO["engine"], AUDIO["voice"], AUDIO["lead_in_s"], AUDIO["gap_s"], AUDIO["level_rms_dbfs"],
                                      AUDIO["fade_in_s"], AUDIO["fade_out_s"], AUDIO["bitrate_kbps"], AUDIO["sample_rate"]]).encode()).hexdigest()[:16]


def record(t, k):
    import numpy as np
    rate = 24000
    lead = np.zeros(int(AUDIO["lead_in_s"] * rate), np.float32)
    gap = np.zeros(int(AUDIO["gap_s"] * rate), np.float32)
    parts, marks, pos = [lead], [], len(lead)
    for ci, c in enumerate(t["concepts"]):
        x, rate = k.create(summary_text(c), voice=AUDIO["voice"], speed=1.0, lang=AUDIO["lang"])
        x = np.asarray(x, np.float32)
        act = x[np.abs(x) > 0.01]
        if len(act):
            x = np.clip(x * (10 ** (AUDIO["level_rms_dbfs"] / 20) / float(np.sqrt(np.mean(act ** 2)))), -1, 1)
        fi, fo = min(len(x), int(AUDIO["fade_in_s"] * rate)), min(len(x), int(AUDIO["fade_out_s"] * rate))
        if fi: x[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)    # Kokoro's onset burst clicks if unfaded
        if fo: x[-fo:] *= np.linspace(1, 0, fo, dtype=np.float32)
        marks.append({"ci": ci, "start": round(pos / rate, 3), "end": round((pos + len(x)) / rate, 3)})
        parts += [x, gap]; pos += len(x) + len(gap)
    pcm = (np.concatenate(parts) * 32767).astype("<i2").tobytes()
    out = os.path.join(AUDIO["out_dir"], t["id"] + ".mp3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(rate), "-ac", "1", "-i", "pipe:0",
                    "-ar", str(AUDIO["sample_rate"]), "-ac", "1", "-b:a", f"{AUDIO['bitrate_kbps']}k", out], input=pcm, check=True)
    return marks


def main(argv):
    models = argv[argv.index("--models") + 1] if "--models" in argv else os.environ.get("TTS_MODEL_DIR", "models")
    only = [a for a in argv if not a.startswith("--") and a != models]
    os.makedirs(AUDIO["out_dir"], exist_ok=True)
    voice = None
    for tid in ORDER:
        if only and tid not in only:
            continue
        t = json.load(open(os.path.join(TOPICS_DIR, f"topic-{tid}.json")))
        meta_path = os.path.join(AUDIO["out_dir"], tid + ".json")
        h = topic_hash(t)
        if not only and os.path.exists(meta_path) and json.load(open(meta_path)).get("hash") == h:
            continue
        if voice is None:
            from kokoro_onnx import Kokoro
            voice = Kokoro(*[os.path.join(models, f) for f in AUDIO["model_files"]])
        marks = record(t, voice)
        json.dump({"hash": h, "file": f"audio/summary/{tid}.mp3", "marks": marks}, open(meta_path, "w"), indent=0)
        print(tid, len(marks), "concepts", round(marks[-1]["end"] / 60, 1), "min")


if __name__ == "__main__":
    main(sys.argv[1:])
