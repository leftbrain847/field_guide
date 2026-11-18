"""Spanish summaries for Listen (topics/es/): see what needs translating, and mark lines current after editing them.

    python3 build/es.py                 # per topic: current, stale (English changed), missing, orphaned
    python3 build/es.py todo <topic>    # the English to translate for that topic's stale and missing lines
    python3 build/es.py stamp <topic>   # after updating the Spanish: re-fingerprint every line against today's English
"""
import importlib.util, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("build", os.path.join(HERE, "build.py"))
build = importlib.util.module_from_spec(spec); spec.loader.exec_module(build)


def load(tid):
    p = os.path.join(build.ES_DIR, f"topic-{tid}.json")
    es = json.load(open(p)) if os.path.exists(p) else {"topic": tid, "language": "es", "concepts": []}
    return p, es, json.load(open(os.path.join(build.TOPICS_DIR, f"topic-{tid}.json")))["concepts"]


def status(tid):
    _, es, concepts = load(tid)
    by = {e["en"]: e for e in es["concepts"]}
    cur = [c["n"] for c in concepts if c["n"] in by and by[c["n"]]["src"] == build.es_source(c)]
    stale = [c["n"] for c in concepts if c["n"] in by and by[c["n"]]["src"] != build.es_source(c)]
    missing = [c["n"] for c in concepts if c["n"] not in by]
    orphaned = [n for n in by if n not in {c["n"] for c in concepts}]
    return cur, stale, missing, orphaned


if __name__ == "__main__":
    cmd, tid = (sys.argv[1:] + [None, None])[:2]
    if cmd == "todo":
        _, es, concepts = load(tid)
        cur, stale, missing, _ = status(tid)
        for c in concepts:
            if c["n"] in stale or c["n"] in missing:
                print(json.dumps({"en": c["n"], "summary": c["s"]}, ensure_ascii=False))
    elif cmd == "stamp":
        p, es, concepts = load(tid)
        src = {c["n"]: build.es_source(c) for c in concepts}
        for e in es["concepts"]:
            if e["en"] in src:
                e["src"] = src[e["en"]]
        with open(p, "w") as f:
            json.dump(es, f, ensure_ascii=False, indent=1); f.write("\n")
        print(f"{tid}: stamped {sum(e['en'] in src for e in es['concepts'])} lines")
    else:
        for t in build.ORDER:
            if os.path.exists(os.path.join(build.TOPICS_DIR, f"topic-{t}.json")):
                cur, stale, missing, orphaned = status(t)
                print(f"{t:14s} current {len(cur):3d}  stale {len(stale):2d}  missing {len(missing):2d}  orphaned {len(orphaned):2d}")
