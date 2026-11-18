# Mastery Field Guide

Mastery in as few words as possible: curated topics in big categories, each concept a one-line summary plus nested dropdown sections, with spaced-repetition flashcards. One self-contained page that works offline. Moved here from `leftbrain847/index` (`field_guide/`) on 2026-11-17; history before that lives in the index repo.

## Run
```
python3 build/build.py          # writes web/mastery_field_guide.html, the committed page
open web/mastery_field_guide.html
```
The index's homepage copies `web/mastery_field_guide.html` from `main` nightly (`showcase` entry `mastery_field_guide`). The live study copy is a claude.ai artifact; republish it from the same file.

## Test
```
pip install pytest && pytest -q     # every topic file is well formed and wired in, and the committed page is current
node --test                         # snapshot script tests
```
`node --test` also covers Listen mode's logic (`tests/listen.test.mjs`) and Next mode's ranking (`tests/recent.test.mjs`). Browser smoke checks at phone width (not in CI): `PWMOD=$(npm root -g)/playwright node tests/browser/smoke_categories.mjs $PWD/web/mastery_field_guide.html`, and `node tests/browser/smoke_listen.mjs $PWD/web/mastery_field_guide.html shot.png` (Listen with a fake speech engine). `smoke_next.mjs` and `smoke_next_listen.mjs` take the same argument and check Next mode end to end.

## Deployed
- Live: https://leftbrain847.github.io/mastery_field_guide/ (once the index points at this repo)

## Next
A fourth mode: every built topic ranked by how long since you last used it, so daily study rotates across whole topics. **Review next** lists started topics, longest-unused first, with due flashcards; **Not started** keeps untouched topics apart so they don't crowd the list. A use is opening a concept, grading a card or a concept playing in Listen; landing on a tab doesn't count. Uses are kept in this browser only. A topic's clock resets at most once a minute, and Listen counts a concept only once sound actually starts. Settings: `CONFIG.next` (excluded topics and categories, what counts, where a tap opens, due counts); logic in `build/recent.js`.

## Listen
A third mode beside Read and Study, modelled on comprehensible_input's player. Tick topics, groups or single concepts (the selection spans the whole guide), choose **Summaries** or **Full notes**, and press play. The bottom bar shows what is playing (tap it for the queue), then repeat (each concept ×2, ×3, off), previous, play/pause, next and speed (0.8–2×).

**Summaries are recorded** at build time with Kokoro's `af_heart` voice (Kokoro-82M, Apache-2.0, via kokoro-onnx: the engine behind comprehensible_input's Santa voice): one MP3 per topic in `audio/summary/` with marks, played concept by concept, so they keep playing in other apps and on the lock screen. **Full notes** use the device's own voice (it stops when you leave the page on iPhone, and the Claude app may not allow it at all).

Record after changing any concept's name or summary (a changed topic is left out of the page until re-recorded, so it falls back to the device voice):
```
pip install -r build/requirements-audio.txt
mkdir -p models && for f in kokoro-v1.0.onnx voices-v1.0.bin; do curl -L -o models/$f https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f; done
python3 build/audio.py --models models && python3 build/build.py
```
About 26 minutes on a laptop CPU for every topic; only changed topics are re-recorded. The page loads `audio/summary/<topic>.mp3` next to itself: the homepage copies `audio/` (showcase `assets: audio`); a claude.ai artifact needs those files published with it. Settings: `CONFIG.listen` (player) and `AUDIO` in `build/audio.py` (engine, voice, gaps, bitrate).

## Layout
- `topics/topic-<id>.json`: one file per built tab. Schema and writing rules are in `FORMAT.md`.
- `build/template.html`: the page. `CONFIG` holds categories, planned-topic placeholders and spaced-repetition settings. On claude.ai it syncs progress through the artifact's private per-user storage; elsewhere it falls back to browser storage.
- `build/build.py`: inlines the topics into the template. `build/merge_em.py` rebuilds the medicine topic from `drafts/`.
- `build/limits.json`: the compact standard's limits (250 words and up to 4 written cards per concept, a 150-concept cap, per-topic targets), enforced by the tests for every rewritten topic.
- `drafts/`: partial or retired content. `verification/`: independent dose-check reports for the medicine tab.

## Study plan
Two new concepts a day, one work topic and one operator/human topic, at 3 cards each (2 written plus the summary card). With FSRS-style scheduling at 90% retention that settles near 60 reviews, about 8 minutes, a day. The 142 compact concepts take about ten weeks for a first pass. New material must pass the admission test in `FORMAT.md`; at the 150-concept cap, something of lower value leaves.

## Adding a topic
1. Write `topics/topic-<id>.json` following `FORMAT.md` (compact standard), and add it to `build/limits.json`.
2. Add the id to `ORDER` in `build/build.py`, put it in a category in `CONFIG.categories`, and remove its placeholder.
3. `python3 build/build.py`, then commit the topic and `web/` together.

## Medicine (in progress)
Clinical-first tabs with full dosing; every dose and threshold gets an independent verification pass before it ships. Planned next: store medicine as blocks (condition, mechanism, drug, test), each written once, arranged by two outlines (Clinical and Mechanisms) with a toggle; flashcards belong to blocks so progress is shared.

## Ship a sprint day
Set `project` in `sprint.config.json`, then `node scripts/snapshot.mjs <page.html>` (add `--public` to opt in to the public sprint site) and commit `snapshots/` in the PR.
