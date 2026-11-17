"""Merge the two agentic partial files into topic-agentic.json, ordering groups from 0 to mastery."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
GROUP_ORDER = ["start", "context", "workflow", "verify", "extend", "safety", "automate", "parallel", "team", "landscape", "frontier"]
META = {
    "id": "agentic",
    "title": "Claude Code & agentic work",
    "updated": "2026-11-04",
    "refreshDays": 30,
    "note": ("Claude Code and agentic engineering from first session to how the top individuals and teams work, built mainly from "
             "frontier labs' published material, their engineers' posts and talks, and proven practitioners. This field changes "
             "weekly: features ship, get renamed, and best practices shift with each model release. Refresh this tab at least monthly, "
             "and re-check anything here before you rely on a specific flag or default. Blue Synthesis boxes are conclusions drawn "
             "across sources, not something a single source states."),
}
DRAFTS = os.path.join(os.path.dirname(HERE), "drafts")
parts = [json.load(open(os.path.join(DRAFTS, f))) for f in ("agentic-mechanics.json", "agentic-practices.json")]
groups = {g["key"]: g for p in parts for g in p["groups"]}
concepts = [c for p in parts for c in p["concepts"]]
used = {c["g"] for c in concepts}
order = [k for k in GROUP_ORDER if k in groups and k in used]
concepts.sort(key=lambda c: order.index(c["g"]))
seen, sources = set(), []
for p in parts:
    for s in p.get("sources", []):
        if s["url"] not in seen:
            seen.add(s["url"]); sources.append(s)
topic = {**META, "groups": [groups[k] for k in order], "concepts": concepts, "sources": sources}
json.dump(topic, open(os.path.join(os.path.dirname(HERE), "topics", "topic-agentic.json"), "w"), ensure_ascii=False, indent=1)
print(len(concepts), "concepts,", sum(len(c.get("cards", [])) for c in concepts), "cards,", len(sources), "sources")
