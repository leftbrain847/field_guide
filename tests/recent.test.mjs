// Next mode logic (build/recent.js, inlined into the page by build/build.py).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../build/recent.js", import.meta.url), "utf8");
const R = new Function(src + "; return Recent;")();

const DAY = 864e5;
const now = new Date(2026, 10, 18, 9, 0).getTime();   // local time, so day math matches the page

test("lastUsed takes the newer of a stamp and the topic's newest card review", () => {
  const srs = { a: { cards: { x: { last: now - 5 * DAY }, y: { last: now - 2 * DAY } } }, b: { cards: {} } };
  const last = R.lastUsed(["a", "b", "c"], { a: now - 9 * DAY, b: now - 1 * DAY }, srs);
  assert.deepEqual(last, { a: now - 2 * DAY, b: now - 1 * DAY, c: 0 });
});

test("order lists started topics longest-unused first and keeps never-used topics apart in guide order", () => {
  const last = { a: now - 1 * DAY, b: 0, c: now - 10 * DAY, d: 0, e: now - 3 * DAY, f: now - 3 * DAY };
  const o = R.order(["a", "b", "c", "d", "e", "f"], last);
  assert.deepEqual(o.started.map(x => x.id), ["c", "e", "f", "a"]);
  assert.equal(o.started[0].t, now - 10 * DAY);
  assert.deepEqual(o.fresh, ["b", "d"]);
  assert.deepEqual(R.order([], {}), { started: [], fresh: [] });
});

test("label counts calendar days, so last night is 1d ago, not today", () => {
  const lastNight = new Date(2026, 10, 17, 23, 30).getTime();
  assert.equal(R.label(0, now), "new");
  assert.equal(R.label(now - 3600e3, now), "today");
  assert.equal(R.label(lastNight, now), "1d ago");
  assert.equal(R.label(now - 12 * DAY, now), "12d ago");
});

test("eligible skips planned topics and excluded topics or categories", () => {
  const cats = [{ key: "data", topics: ["a", "p"] }, { key: "med", topics: ["m"] }, { key: "mind", topics: ["e", "h"] }];
  const byId = { a: {}, p: { placeholder: true }, m: {}, e: {}, h: {} };
  assert.deepEqual(R.eligible(cats, byId, []), ["a", "m", "e", "h"]);
  assert.deepEqual(R.eligible(cats, byId, ["med", "h"]), ["a", "e"]);
});

test("touch returns a new stamp map and leaves the old one alone", () => {
  const old = { a: 1 };
  const next = R.touch(old, "b", 5);
  assert.deepEqual(next, { a: 1, b: 5 });
  assert.deepEqual(old, { a: 1 });
});
