// Listen mode: pure logic (no DOM, no speech). build.py inlines this file into the page; tests/listen.test.mjs
// loads it in Node. Mirrors comprehensible_input's player: pick sections in a tree, play the selection as one
// queue, repeat each item x2/x3, previous/next, speed. Summaries play from recordings; full notes and Spanish
// summaries use the device's own voice.
const Listen = (() => {
  const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

  /** Spoken text from a body's HTML: list items and blocks end as sentences, tags go, entities decode. */
  function textOf(html) {
    return String(html || "")
      .replace(/<\/(li|p|div|pre|h\d)>/gi, ". ")
      .replace(/<br\s*\/?>/gi, ". ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&(#?\w+);/g, (m, e) => ENTITIES[e.toLowerCase()] ?? m)
      .replace(/\s+/g, " ")
      .replace(/([.:;!?])\s*\.(\s|$)/g, "$1$2")   // ". ." and ":." left by block ends
      .replace(/\s+([.,;:!?])/g, "$1")
      .trim();
  }

  /** Split text into pieces of at most `max` characters, at sentence ends where possible (long utterances get cut
   * off on some browsers, and short ones let previous/next and speed changes land quickly). */
  function chunks(text, max) {
    const out = [];
    const sentences = String(text).match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [];
    let cur = "";
    const push = () => { if (cur.trim()) out.push(cur.trim()); cur = ""; };
    for (const s of sentences) {
      if ((cur + s).length <= max) { cur += s; continue; }
      push();
      if (s.length <= max) { cur = s; continue; }
      let rest = s;                                // one very long sentence: split at commas, then spaces
      while (rest.length > max) {
        let cut = Math.max(rest.lastIndexOf(", ", max), rest.lastIndexOf(" ", max));
        if (cut < max / 3) cut = max;
        out.push(rest.slice(0, cut + 1).trim());
        rest = rest.slice(cut + 1);
      }
      cur = rest;
    }
    push();
    return out;
  }

  /** What one concept says. "summary": its name and one-line summary. "full": then every section and nested child. */
  function conceptText(c, content) {
    const parts = [c.n + ".", c.s];
    if (content === "full") {
      const walk = secs => (secs || []).forEach(sec => { parts.push(sec.t + ".", textOf(sec.b)); walk(sec.c); });
      walk(c.x);
    }
    return parts.filter(Boolean).join(" ").replace(/\.\./g, ".");
  }

  const key = (tid, ci) => tid + "/" + ci;

  /** The play queue: every selected concept in page order (topic, then group, then concept), each repeated `repeat`
   * times in a row. Items carry their spoken chunks. */
  function buildQueue(topics, selected, opts) {
    const q = [];
    for (const t of topics) {
      for (const g of t.groups || []) {
        t.concepts.forEach((c, ci) => {
          if (c.g !== g.key || !selected.has(key(t.id, ci))) return;
          // Spanish: the concept's translated name and summary when one is current, else its English summary.
          const alt = opts.lang === "es" && opts.tr && opts.tr[t.id] && opts.tr[t.id][ci];
          const text = alt ? conceptText({ n: alt[0], s: alt[1] }, "summary") : conceptText(c, opts.content);
          const parts = chunks(text, opts.chunkChars);
          for (let r = 1; r <= opts.repeat; r++)
            q.push({ key: key(t.id, ci), tid: t.id, ci, title: alt ? alt[0] : c.n, topic: t.title, pass: r, parts, lang: alt ? "es" : "en" });
        });
      }
    }
    return q;
  }

  /** Every concept key under a topic, or under one group of it. */
  const keysOf = (t, groupKey) =>
    t.concepts.map((c, ci) => ({ c, ci })).filter(o => !groupKey || o.c.g === groupKey).map(o => key(t.id, o.ci));

  /** A parent row's checkbox: "all", "some" or "none" of its keys selected. */
  function tri(keys, selected) {
    const on = keys.filter(k => selected.has(k)).length;
    return on === 0 ? "none" : on === keys.length ? "all" : "some";
  }

  /** Repeat button: off (1) -> x2 -> x3 -> off. */
  function nextRepeat(r, counts) {
    const i = counts.indexOf(r);
    return counts[(i + 1) % counts.length];
  }

  /** Previous: restart the current item, unless it began less than `graceMs` ago (then the item before). */
  function prevIndex(i, elapsedMs, graceMs) {
    return elapsedMs > graceMs ? i : Math.max(0, i - 1);
  }

  /** Next item when one finishes, or null at the end. */
  const following = (i, length) => (i + 1 < length ? i + 1 : null);

  /** Device voices for one language (cfg.langPrefix), best first: preferred languages in order, then quality words (premium, enhanced),
   * then on-device voices, then by name. */
  function rankVoices(all, cfg) {
    const norm = l => String(l || "").replace("_", "-").toLowerCase();
    const langRank = v => { const k = cfg.preferredLangs.findIndex(p => norm(v.lang) === p.toLowerCase()); return k < 0 ? cfg.preferredLangs.length : k; };
    const q = v => { const id = (v.voiceURI + " " + v.name).toLowerCase(); const k = cfg.quality.findIndex(w => id.includes(w)); return k < 0 ? cfg.quality.length : k; };
    return all
      .filter(v => norm(v.lang).startsWith(cfg.langPrefix))
      .sort((a, b) => q(a) - q(b) || langRank(a) - langRank(b) || Number(b.localService) - Number(a.localService) || a.name.localeCompare(b.name));
  }

  /** A recorded span for one concept: {file, start, end} from the page's inlined marks, or null (no recording). */
  function recSpan(rec, tid, ci) {
    const r = rec && rec[tid], m = r && r.marks[ci];
    return m ? { file: r.file, start: m[0], end: m[1] } : null;
  }

  /** While a recording plays straight on, does the next item start where the file already is (no seek needed)? */
  const flowsOn = (cur, next, t, slack) => !!(cur && next && cur.file === next.file && next.start >= cur.end && t <= next.start + slack);

  const clampSpeed = (speeds, s, fallback) => (typeof s === "number" && speeds.includes(s) ? s : fallback);

  return { textOf, chunks, conceptText, key, buildQueue, keysOf, tri, nextRepeat, prevIndex, following, rankVoices, clampSpeed, recSpan, flowsOn };
})();
