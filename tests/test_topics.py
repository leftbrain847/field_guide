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


LIMITS = json.loads((ROOT / "build" / "limits.json").read_text())


def concept_words(c):
    text = c["s"] + " " + " ".join(s["b"] for s in sections(c["x"]))
    return len(re.sub(r"<[^>]+>", " ", text).split())


@pytest.mark.parametrize("tid", LIMITS["enforced"])
def test_compact_standard(tid):
    """Rewritten tabs keep to the compact standard in FORMAT.md (limits in build/limits.json)."""
    t = json.loads((ROOT / "topics" / f"topic-{tid}.json").read_text())
    lo, hi = LIMITS["cards_per_concept"]
    assert t["groups"][0]["key"] == LIMITS["first_group"] and t["concepts"][0]["g"] == LIMITS["first_group"], "tab must open with its map concept"
    assert len(t["concepts"]) <= LIMITS["topic_targets"][tid], f"{tid}: over its concept target"
    for c in t["concepts"]:
        assert concept_words(c) <= LIMITS["max_words_per_concept"], f"{c['n']}: {concept_words(c)} words"
        assert lo <= len(c["cards"]) <= hi, f"{c['n']}: {len(c['cards'])} cards"


def test_concept_cap():
    total = sum(len(json.loads((ROOT / "topics" / f"topic-{t}.json").read_text())["concepts"]) for t in LIMITS["topic_targets"])
    assert sum(LIMITS["topic_targets"].values()) <= LIMITS["total_concept_cap"]
    assert set(LIMITS["enforced"]) <= set(LIMITS["topic_targets"])
    if set(LIMITS["enforced"]) == set(LIMITS["topic_targets"]):
        assert total <= LIMITS["total_concept_cap"]


def test_every_topic_has_a_current_recording():
    """Listen's recorded summaries must match the text: changing a concept's name or summary without re-recording
    would silently drop that topic to the device voice (silent in the Claude app). Fix: python3 build/audio.py."""
    spec = importlib.util.spec_from_file_location("fg_audio", ROOT / "build" / "audio.py")
    audio = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(audio)
    order = re.search(r"^ORDER = \[(.*)\]$", BUILD, re.M).group(1)
    for tid in re.findall(r'"([a-z0-9_]+)"', order):
        meta = ROOT / "audio" / "summary" / f"{tid}.json"
        assert meta.exists(), f"{tid}: no recording; run python3 build/audio.py {tid}"
        t = json.loads((ROOT / "topics" / f"topic-{tid}.json").read_text())
        assert json.loads(meta.read_text())["hash"] == audio.topic_hash(t), f"{tid}: recording is stale; run python3 build/audio.py {tid}"
