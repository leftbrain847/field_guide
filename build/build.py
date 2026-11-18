"""Assemble the Mastery Field Guide page: build/template.html + topics/topic-*.json -> one self-contained HTML file.

    python build/build.py [OUT]      # default OUT: web/mastery_field_guide.html, the committed page

The index's homepage copies web/mastery_field_guide.html from main, so rebuild and commit it with every topic or
template change; tests/test_topics.py fails when it is out of date.
ORDER lists the built topics; a topic also needs its id in CONFIG.categories in build/template.html.
"""
import hashlib
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TOPICS_DIR = os.path.join(ROOT, "topics")
PAGE = os.path.join(ROOT, "web", "mastery_field_guide.html")
# Standard document wrapper (the same skeleton claude.ai adds when publishing an artifact), so the file
# renders in standards mode anywhere it is opened and the artifact publisher recognizes it instead of nesting it.
SKELETON_HEAD = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>'
SKELETON_TAIL = "</body></html>"
ORDER = ["em", "fundamentals", "git", "workato", "databricks", "powerautomate", "agentic", "fallacies", "eq", "nfl", "firstaid", "gtm", "venture", "bookshelf"]

def check(t):
    keys = {g["key"] for g in t["groups"]}
    for c in t["concepts"]:
        assert c["g"] in keys, (t["id"], c["n"], c["g"])
        assert c["s"] and c["x"], (t["id"], c["n"])
        stack = list(c["x"])
        while stack:
            sec = stack.pop(); ch = sec.get("c", [])
            assert isinstance(ch, list), (t["id"], c["n"], sec["t"], "children must be a list")
            stack += ch
        for k in c.get("cards", []):
            assert k["q"] and k["a"], (t["id"], c["n"])
    return len(t["concepts"]), sum(len(c.get("cards", [])) for c in t["concepts"])

def audio_marks():
    """Recorded summaries (build/audio.py) whose text still matches the topic: {topic: {file, marks}}. A topic whose
    text changed since recording is left out, so the page reads it with the device voice until it is re-recorded."""
    import importlib.util   # load by path: the repo's audio/ folder would shadow a plain "import audio"
    spec = importlib.util.spec_from_file_location("fg_audio", os.path.join(HERE, "audio.py"))
    audio = importlib.util.module_from_spec(spec); spec.loader.exec_module(audio)
    out = {}
    for tid in ORDER:
        meta = os.path.join(audio.AUDIO["out_dir"], tid + ".json")
        if not os.path.exists(meta):
            continue
        m = json.load(open(meta))
        if m.get("hash") == audio.topic_hash(json.load(open(os.path.join(TOPICS_DIR, f"topic-{tid}.json")))):
            out[tid] = {"file": m["file"], "marks": [[k["start"], k["end"]] for k in m["marks"]]}
    return out


ES_DIR = os.path.join(os.path.dirname(HERE), "topics", "es")


def es_source(c):
    """Fingerprint of the English a translation was made from: a changed name or summary marks it stale."""
    return hashlib.sha1((c["n"] + "\n" + c["s"]).encode()).hexdigest()[:12]


def es_text(quiet=True):
    """Spanish name and summary per concept, for Listen's Español option: {topic: [[name, summary] | None, ...]}.
    Missing or stale translations are None, and the page reads that concept's English summary instead."""
    out = {}
    for tid in ORDER:
        p, tp = os.path.join(ES_DIR, f"topic-{tid}.json"), os.path.join(TOPICS_DIR, f"topic-{tid}.json")
        if not (os.path.exists(p) and os.path.exists(tp)):
            continue
        by_name = {e["en"]: e for e in json.load(open(p))["concepts"]}
        concepts = json.load(open(tp))["concepts"]
        row, stale = [], []
        for c in concepts:
            e = by_name.get(c["n"])
            ok = e is not None and e.get("src") == es_source(c)
            row.append([e["n"], e["s"]] if ok else None)
            if e is not None and not ok:
                stale.append(c["n"])
        if any(row):
            out[tid] = row
        names = {c["n"] for c in concepts}
        missing = sum(1 for c in concepts if c["n"] not in by_name)
        orphans = [n for n in by_name if n not in names]
        if not quiet and (stale or missing or orphans):
            print(f"es: {tid}: {len(stale)} stale, {missing} missing, {len(orphans)} orphaned"
                  + (" | stale: " + "; ".join(stale) if stale else "") + (" | orphaned: " + "; ".join(orphans) if orphans else ""))
    return out


def render(quiet=True):
    """The whole page as one string (the committed page must equal this)."""
    blocks = []
    for tid in ORDER:
        p = os.path.join(TOPICS_DIR, f"topic-{tid}.json")
        if not os.path.exists(p):
            print("missing", tid); continue
        t = json.load(open(p))
        n = check(t)
        if not quiet:
            print(tid, *n)
        js = json.dumps(t, ensure_ascii=False).replace("</", "<\\/")
        blocks.append(f'<script type="application/json" id="topic-{tid}">{js}</script>')
    listen = open(os.path.join(HERE, "listen.js")).read()
    assert "</" not in listen, "listen.js must not contain '</' (it is inlined in a script tag)"
    html = open(os.path.join(HERE, "template.html")).read().replace("<!--TOPICS-->", "\n".join(blocks))
    html = html.replace("<!--LISTEN-->", "<script>\n" + listen.rstrip("\n") + "\n</script>")
    recent = open(os.path.join(HERE, "recent.js")).read()
    assert "</" not in recent, "recent.js must not contain '</' (it is inlined in a script tag)"
    html = html.replace("<!--RECENT-->", "<script>\n" + recent.rstrip("\n") + "\n</script>")
    es = json.dumps(es_text(quiet), ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")   # no "<" can end or open a tag
    html = html.replace("<!--ES-->", '<script type="application/json" id="es-text">' + es + "</script>")
    html = html.replace("<!--AUDIO-->", '<script type="application/json" id="audio-marks">' + json.dumps(audio_marks()) + "</script>")
    return SKELETON_HEAD + "\n" + html.rstrip("\n") + "\n\n" + SKELETON_TAIL


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else PAGE
    html = render(quiet=False)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    open(out, "w").write(html)
    print("wrote", out, len(html) // 1024, "KB")
