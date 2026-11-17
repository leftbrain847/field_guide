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
Browser smoke checks at phone width (not in CI): `PWMOD=$(npm root -g)/playwright node tests/browser/smoke_categories.mjs $PWD/web/mastery_field_guide.html`.

## Deployed
- Live: https://leftbrain847.github.io/mastery_field_guide/ (once the index points at this repo)

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
