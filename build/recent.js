// Next mode: rank whole topics by how long since you last used them, so daily study rotates across the guide.
// Pure logic: build/build.py inlines it into the page; tests/recent.test.mjs covers it.
const Recent = (() => {
  const DAY = 864e5;
  const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

  // Newest use per topic: the stamps the page records (read, listen, study) or the topic's newest flashcard review.
  function lastUsed(ids, stamps, srs){
    const out = {};
    ids.forEach(id => {
      let t = Number(stamps && stamps[id]) || 0;
      const cards = srs && srs[id] && srs[id].cards;
      if (cards) Object.values(cards).forEach(c => { if (c && Number(c.last) > t) t = Number(c.last); });
      out[id] = t;
    });
    return out;
  }

  // Started topics, longest-unused first (ties keep guide order), and never-used topics in guide order.
  // Kept apart so topics you haven't begun don't crowd out the ones you're rotating through.
  function order(ids, last){
    const started = ids.map((id, i) => ({ id, i, t: last[id] || 0 })).filter(o => o.t)
      .sort((a, b) => (a.t - b.t) || (a.i - b.i)).map(({ id, t }) => ({ id, t }));
    return { started, fresh: ids.filter(id => !last[id]) };
  }

  // Calendar days since a use, in local time: 0 = today.
  function daysSince(t, now){ return t ? Math.max(0, Math.round((dayStart(now) - dayStart(t)) / DAY)) : null; }

  function label(t, now){
    const d = daysSince(t, now);
    if (d === null) return "new";
    if (d === 0) return "today";
    return d + "d ago";
  }

  // Which topics may be suggested: built topics, minus excluded topic ids or category keys.
  function eligible(cats, topicById, exclude){
    const skip = new Set(exclude || []);
    return cats.filter(c => !skip.has(c.key)).flatMap(c => c.topics)
      .filter(id => topicById[id] && !topicById[id].placeholder && !skip.has(id));
  }

  function touch(stamps, id, now){ return { ...(stamps || {}), [id]: now }; }

  return { lastUsed, order, daysSince, label, eligible, touch };
})();
