# Topic file format (for encyclopedia tabs)

## Compact standard (from 2026-11-18; applies to every tab except medicine, reasoning and games)

The reader studies 2 concepts a day. Retrieval practice and spacing do the teaching; rereading long bodies is low value. So bodies stay short and cards carry the learning.

**Concept = one model + one rule + one failure mode + one example, in at most 250 words** (summary plus section bodies; cards not counted). Sections, in order:
1. `Model`: how it works, 2-4 lines.
2. `Traps`: what breaks it, 2-3 lines (trap blocks).
3. `Example`: one concrete case (for numbers, one worked example).
4. `Ask` (optional): one design-review question.
5. `Try it` (optional): one real-world practice prompt, for skills learned by doing (EQ).
The summary `s` is the rule, one sentence.

**Cards: 3 per concept by default.** The page already adds a rule card from the summary (`CONFIG.autoCardFromSummary`), so write 2: one application or discrimination card (a scenario: which pattern applies?) and one trap card. Write up to 4 only for numeric concepts, and as few as 1 for a small residue concept. No "list the five X" cards; ask which item explains a scenario instead. Questions focused and effortful, never yes/no.

**Every tab opens with a map concept** in group `map`: the 1-3 organizing schemas of the topic. Every other concept fits under one of them.

**Perishable facts** (vendor features, prices, limits, names) stay off cards unless the decision depends on them; date-stamp them in prose ("as of Nov 2026"). Syntax, menu paths and limits are reference material: point to the official docs in `sources` instead.

**Admission test** for any new concept. It enters only if all six hold:
1. Durable: still true in 5 years, or decision-relevant within 12 months (date-stamp if vendor-specific).
2. Not look-up-able: needed in your head at decision time.
3. Not derivable: if it follows from an existing concept, it becomes a card on that concept.
4. Evidence graded: research, practitioner consensus, or opinion. Opinion-only enters as a reusable lens, one concept at most.
5. Fits the template: 250 words, 3 cards.
6. Worth about 10 minutes of future review, and at the cap (`build/limits.json`, 150 concepts) something of lower value leaves.

`build/limits.json` holds the limits and per-topic targets; tests enforce them for every topic listed under `enforced`.

## Schema

Write ONE valid JSON file (UTF-8, no comments, no trailing commas). Validate it with `python3 -c "import json;json.load(open(PATH))"` before finishing.

```json
{
  "id": "workato",                       // short slug
  "title": "Workato",                    // tab label
  "updated": "2026-11-03",               // content currency date
  "note": "One or two sentences: what this tab covers, that it reflects the product as of the date, and that it should be refreshed regularly (say how often, e.g. quarterly, and why: release cadence).",
  "groups": [ { "key": "foundations", "label": "Foundations" } ],   // 4-7 groups, in reading order
  "concepts": [
    {
      "n": "Recipes, triggers and actions",            // heading (concept name)
      "g": "foundations",                              // group key
      "s": "ONE sentence summary. Always exactly one sentence.",
      "x": [                                           // nested dropdown sections, 3-5 per concept
        { "t": "How it works", "b": "<p>HTML body</p>",
          "c": [ { "t": "Optional nested child", "b": "<pre><code>...</code></pre>" } ] },
        { "t": "Senior-level nuance", "b": "<ul><li>...</li></ul>" },
        { "t": "Failure modes", "b": "<div class=\"trap\"><b>Trap:</b> ...</div>" }
      ],
      "cards": [                                        // 3-5 flashcards per concept
        { "q": "Short, specific question with one right answer", "a": "Answer in 1-2 sentences, plain text, no HTML." }
      ]
    }
  ]
}
```

## Body HTML allowed
`<p> <ul> <ol style="padding-left:18px;margin:0 0 8px"> <li> <b> <i> <code> <pre><code> <div class="trap"><b>Trap:</b> ...</div>`. Escape `<` and `>` inside code as `&lt;` `&gt;`. No links, no images, no inline citation markers like [1].

## Depth and voice (medicine and older tabs; the compact standard above overrides depth for the rest)
- Audience: a senior BI engineer (10 yrs data, 3 in healthcare / telepsychiatry) who wants to become a senior/staff-level master user. The org is moving off Azure Data Factory toward Workato, Microsoft Fabric, and possibly Databricks. Healthcare/HIPAA angles are welcome where real and verifiable.
- Each concept: "How it works" (mechanics), then senior-level nuance / trade-offs, failure modes or traps, and where useful "Design review questions" or a code/config example.
- Plain, direct sentences. Active voice. No em-dash asides, no "not X but Y", no "worth noting", no marketing language.
- Cards test recall of things a practitioner must know (limits, defaults, which feature solves which problem, gotchas). Avoid trivia like launch dates unless they matter.

## Accuracy rules (strict)
- Your knowledge may be stale; the date is 2026-11-04. Use WebSearch/WebFetch on official docs, release notes, and product blogs to confirm current names, features, GA vs preview status, and defaults. Products get renamed: check.
- Do not state a number, default, limit, or feature name you did not confirm, unless it is long-stable general knowledge. When unsure, describe it qualitatively or omit it.
- Mark preview/beta features as such in the text.

## Extra for the agentic-coding tab
- Allowed extra body block: `<div class="synth"><b>Synthesis:</b> ...</div>` for any conclusion that is your own synthesis across sources rather than something a source states. Everything outside a synth block must be attributable to a source in plain prose (e.g. "Anthropic's Claude Code best practices post recommends..."), never with [1]-style markers.
- When a claim comes from a social post or podcast, say so in the prose ("in an X post", "on the ... podcast") so the reader can weigh it.
- Write a PARTIAL topic file: {"groups":[...],"concepts":[...],"sources":[...]} only (no id/title/updated/note). Sources: 15-30 {"title","url"} with full URLs exactly as fetched or seen in search results; never construct URLs.

## Extra for non-technical topics (NFL, first aid, EQ, affirmations, fallacies)
- The audience note above about a BI engineer does NOT apply; the reader is a curious, analytical adult (economics background, flags motivated reasoning in himself, prefers direct, evidence-based material over hype). Write for a practitioner who wants real mastery.
- Write the FULL topic file (id, title, updated "2026-11-04", refreshDays, note, groups, concepts, sources). sources: 12-25 {"title","url"} full URLs exactly as fetched or seen in search results; never construct URLs.
- The "trap" block is fine for common mistakes and misconceptions. The `<div class="synth"><b>Synthesis:</b> ...</div>` block is allowed for your own cross-source conclusions.
- Section titles can fit the subject (e.g. "The rule", "How it's officiated", "Edge cases", "Evidence", "Try it"); keep 3-5 per concept.

## Extra for Medicine tabs (clinical-first, ER standard)
- Reader goal: content an emergency physician would read and call correct and comprehensive. Adult focus unless the concept is pediatric or obstetric.
- Clinical-first concept shape. Use these section titles, in this order, 4-5 per concept:
  1. "Recognize": presentation, key history and exam findings, red flags, must-not-miss differentials.
  2. "Workup": labs, ECG, imaging, validated decision rules (name them and their criteria accurately), diagnostic thresholds.
  3. "Treat": management in order of priority with FULL DOSING: drug, dose, route, frequency or rate, max dose, key weight-based or renal adjustments, and the guideline the dose comes from named in prose (e.g. "per the 2025 AHA adult ACLS guideline"). Use <ul> or <ol>.
  4. "Pitfalls and disposition": common errors, when to admit/ICU/consult, what kills patients. Trap blocks fit here.
  5. "Why it happens" (optional, short): just enough mechanism to reason through management.
- Dosing and thresholds are the highest-risk content. Every dose and numeric threshold must come from a current guideline or authoritative reference you actually opened this session (AHA/ACC, ACEP clinical policies, Surviving Sepsis Campaign, ADA/JBDS, AHA/ASA stroke, IDSA, ATS/ERS, GINA, GOLD, KDIGO, ACOG, AAP, CDC, WHO, StatPearls on NCBI Bookshelf, FDA labels on DailyMed, WikEM). Check for 2025-2026 guideline updates. If two sources disagree, give both and name them. If you cannot confirm a dose, write "confirm dose in a current reference" rather than guessing.
- Do not reproduce copyrighted text (ATLS manual, UpToDate, Tintinalli, Rosen's, DSM). Summarize facts in your own words.
- Cards: drill doses, thresholds, decision-rule criteria, first-line choices, and must-not-miss diagnoses. 4-5 per concept.
