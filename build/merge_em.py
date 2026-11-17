"""Merge the Emergency medicine drafts (drafts/em-a.json, drafts/em-b.json) into topics/topic-em.json.

    python field_guide/build/merge_em.py

Each concept is a medicine block: it gets a stable "id" (lowercase_with_underscores) and "type": "condition",
so later outlines (Clinical, Mechanisms) can reference the same block.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DRAFTS = os.path.join(ROOT, "drafts")
OUT = os.path.join(ROOT, "topics", "topic-em.json")
GROUP_ORDER = ["resus", "cardio", "resp", "neuro", "trauma", "env", "metabolic", "abdo", "infect", "obpeds"]
META = {
    "id": "em",
    "title": "Emergency medicine",
    "updated": "2026-11-07",
    "refreshDays": 180,
    "note": ("Clinical-first emergency medicine with full adult dosing: how each emergency presents, how to work it up, "
             "how to treat it, and what kills patients. Every dose and threshold was checked against current guidelines "
             "by a second, independent pass, and the guideline behind each one is named. Study material, not clinical "
             "guidance: confirm doses in a current reference before acting. Poisoning and overdose are not covered, apart from cyanide from smoke inhalation in burns. Guidelines "
             "change often; refresh every six months and after any major guideline release."),
}


def slug(name):
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", name.lower())).strip("_")[:48]


parts = [json.load(open(os.path.join(DRAFTS, f))) for f in ("em-a.json", "em-b.json") if os.path.exists(os.path.join(DRAFTS, f))]
groups = {g["key"]: g for p in parts for g in p["groups"]}
concepts = [c for p in parts for c in p["concepts"]]
used = {c["g"] for c in concepts}
order = [k for k in GROUP_ORDER if k in groups and k in used] + sorted(k for k in used if k not in GROUP_ORDER)
concepts.sort(key=lambda c: order.index(c["g"]))
seen_ids = set()
for c in concepts:
    c.setdefault("type", "condition")
    cid = c.get("id") or slug(c["n"])
    while cid in seen_ids:
        cid += "_2"
    c["id"] = cid
    seen_ids.add(cid)
seen, sources = set(), []
for p in parts:
    for s in p.get("sources", []):
        if s["url"] not in seen:
            seen.add(s["url"])
            sources.append(s)
topic = {**META, "groups": [groups[k] for k in order], "concepts": concepts, "sources": sources}
json.dump(topic, open(OUT, "w"), ensure_ascii=False, indent=1)
print(len(concepts), "concepts,", sum(len(c.get("cards", [])) for c in concepts), "cards,", len(sources), "sources")
