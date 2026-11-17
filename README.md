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
`node --test` also covers Listen mode's logic (`tests/listen.test.mjs`). Browser smoke checks at phone width (not in CI): `PWMOD=$(npm root -g)/playwright node tests/browser/smoke_categories.mjs $PWD/web/mastery_field_guide.html`, and `node tests/browser/smoke_listen.mjs $PWD/web/mastery_field_guide.html shot.png` (Listen with a fake speech engine).

## Deployed
- Live: https://leftbrain847.github.io/mastery_field_guide/ (once the index points at this repo)

## Listen
A third mode beside Read and Study, modelled on comprehensible_input's player. Tick topics, groups or single concepts (the selection spans the whole guide), choose **Summaries** or **Full notes**, and press play. The bottom bar shows what is playing (tap it for the queue), then repeat (each concept ×2, ×3, off), previous, play/pause, next and speed (0.8–2×).

**Summaries are recorded** at build time with Piper's `en_US-ljspeech-high` voice (LJ Speech, public domain): one MP3 per topic in `audio/summary/` with marks, played concept by concept, so they keep playing in other apps and on the lock screen. **Full notes** use the device's own voice (it stops when you leave the page on iPhone, and the Claude app may not allow it at all).

Record after changing any concept's name or summary (a changed topic is left out of the page until re-recorded, so it falls back to the device voice):
```
pip install -r build/requirements-audio.txt
mkdir -p models && curl -L -o models/en_US-ljspeech-high.onnx https://huggingface.co/rhasspy/piper-voices/resolve/e9ab671f2a0e50a701b34361136ba3e6a3a9eb0c/en/en_US/ljspeech/high/en_US-ljspeech-high.onnx
curl -L -o models/en_US-ljspeech-high.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/e9ab671f2a0e50a701b34361136ba3e6a3a9eb0c/en/en_US/ljspeech/high/en_US-ljspeech-high.onnx.json
python3 build/audio.py --models models && python3 build/build.py
```
The page loads `audio/summary/<topic>.mp3` next to itself: the homepage copies `audio/` (showcase `assets: audio`); a claude.ai artifact needs those files published with it. Settings: `CONFIG.listen` (player) and `AUDIO` in `build/audio.py` (voice, gaps, bitrate). Voice credit: Piper (GPL, build time only) with the ljspeech voice from rhasspy/piper-voices (dataset: public domain).

## Layout
- `topics/topic-<id>.json`: one file per built tab. Schema and writing rules are in `FORMAT.md`.
- `build/template.html`: the page. `CONFIG` holds categories, planned-topic placeholders and spaced-repetition settings. On claude.ai it syncs progress through the artifact's private per-user storage; elsewhere it falls back to browser storage.
- `build/build.py`: inlines the topics into the template. `build/merge_agentic.py` and `build/merge_em.py` rebuild those two topics from `drafts/`.
- `drafts/`: partial or retired content. `verification/`: independent dose-check reports for the medicine tab.

## Adding a topic
1. Write `topics/topic-<id>.json` following `FORMAT.md`.
2. Add the id to `ORDER` in `build/build.py`, put it in a category in `CONFIG.categories`, and remove its placeholder.
3. `python3 build/build.py`, then commit the topic and `web/` together.

## Medicine (in progress)
Clinical-first tabs with full dosing; every dose and threshold gets an independent verification pass before it ships. Planned next: store medicine as blocks (condition, mechanism, drug, test), each written once, arranged by two outlines (Clinical and Mechanisms) with a toggle; flashcards belong to blocks so progress is shared.

## Ship a sprint day
Set `project` in `sprint.config.json`, then `node scripts/snapshot.mjs <page.html>` (add `--public` to opt in to the public sprint site) and commit `snapshots/` in the PR.
