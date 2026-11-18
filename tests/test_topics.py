"""Every Mastery Field Guide topic file is well formed, so a bad edit fails CI instead of breaking the page."""
import json
import re
from pathlib import Path

import importlib.util

import pytest

ROOT = Path(__file__).resolve().parents[1]
TOPICS = sorted((ROOT / "topics").glob("topic-*.json"))
BUILD = (ROOT / "build" / "build.py").read_text()
TEMPLATE = (ROOT / "build" / "template.html").read_text()


def sections(secs):
    for s in secs:
        yield s
        assert isinstance(s.get("c", []), list), f"children of '{s['t']}' must be a list"
        yield from sections(s.get("c", []))


def test_topics_exist():
    assert TOPICS


@pytest.mark.parametrize("path", TOPICS, ids=lambda p: p.stem)
def test_topic_schema(path):
    t = json.loads(path.read_text())
    for key in ("id", "title", "updated", "note", "groups", "concepts"):
        assert key in t, f"missing {key}"
    assert path.stem == f"topic-{t['id']}"
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", t["updated"])
    keys = {g["key"] for g in t["groups"]}
    for c in t["concepts"]:
        assert c["g"] in keys, f"{c['n']}: unknown group {c['g']}"
        assert c["s"].strip(), f"{c['n']}: empty summary"
        assert c["x"], f"{c['n']}: no sections"
        for s in sections(c["x"]):
            assert s["t"].strip()
        for k in c.get("cards", []):
            assert k["q"].strip() and k["a"].strip(), f"{c['n']}: empty card"
    for s in t.get("sources", []):
        assert s["url"].startswith("https://"), s
    ids = [c["id"] for c in t["concepts"] if "id" in c]
    assert len(ids) == len(set(ids)), "duplicate block ids"
    for i in ids:
        assert re.fullmatch(r"[a-z0-9_]+", i), f"block id {i} must be lowercase_with_underscores"


@pytest.mark.parametrize("path", TOPICS, ids=lambda p: p.stem)
def test_topic_is_wired_in(path):
    tid = json.loads(path.read_text())["id"]
    order = re.search(r"^ORDER = \[(.*)\]$", BUILD, re.M).group(1)
    assert f'"{tid}"' in order, f"{tid} missing from ORDER in build.py"
    assert f'"{tid}"' in TEMPLATE, f"{tid} missing from CONFIG.categories in template.html"


def test_committed_page_is_current():
    """web/mastery_field_guide.html is what the homepage copies, so it must match a fresh build."""
    spec = importlib.util.spec_from_file_location("build", ROOT / "build" / "build.py")
    build = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(build)
    assert (ROOT / "web" / "mastery_field_guide.html").read_text() == build.render(), \
        "page is stale: run python build/build.py and commit web/"


def test_recorded_audio_is_well_formed():
    """Each recorded topic has its MP3 and one mark per concept, in order (build/audio.py)."""
    for meta in sorted((ROOT / "audio" / "summary").glob("*.json")):
        m = json.loads(meta.read_text())
        assert (ROOT / m["file"]).exists(), m["file"]
        t = json.loads((ROOT / "topics" / f"topic-{meta.stem}.json").read_text())
        assert len(m["marks"]) == len(t["concepts"]), f"{meta.stem}: re-record with python build/audio.py"
        prev = 0
        for k in m["marks"]:
            assert prev <= k["start"] < k["end"], (meta.stem, k)
            prev = k["end"]
