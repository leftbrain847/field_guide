# Topic file format (for encyclopedia tabs)

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

## Depth and voice
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
