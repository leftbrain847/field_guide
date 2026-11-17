// Listen mode's pure logic (build/listen.js, inlined into the page by build/build.py).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../build/listen.js", import.meta.url), "utf8");
const L = new Function(src + "; return Listen;")();

const topic = {
  id: "t", title: "Topic",
  groups: [{ key: "b", label: "B" }, { key: "a", label: "A" }],
  concepts: [
    { n: "First", g: "a", s: "One.", x: [{ t: "How", b: "<p>Mechanics &amp; more.</p>", c: [{ t: "Child", b: "<ul><li>x</li><li>y</li></ul>" }] }] },
    { n: "Second", g: "b", s: "Two.", x: [{ t: "Why", b: "<p>Because.</p>" }] },
    { n: "Third", g: "a", s: "Three.", x: [] },
  ],
};
const opts = { content: "summary", chunkChars: 200, repeat: 1 };

test("textOf strips tags, decodes entities and ends blocks as sentences", () => {
  assert.equal(L.textOf("<p>A &amp; B &lt;x&gt;</p><ul><li>one</li><li>two</li></ul>"), "A & B <x>. one. two.");
  assert.equal(L.textOf('<div class="trap"><b>Trap:</b> do not.</div>'), "Trap: do not.");
  assert.equal(L.textOf(""), "");
});

test("summary reads name and summary; full adds every section and nested child", () => {
  assert.equal(L.conceptText(topic.concepts[0], "summary"), "First. One.");
  assert.equal(L.conceptText(topic.concepts[0], "full"), "First. One. How. Mechanics & more. Child. x. y.");
});

test("chunks never exceed the limit and keep every word", () => {
  const text = "Short one. " + "word ".repeat(120).trim() + ". Last bit.";
  const parts = L.chunks(text, 80);
  assert.ok(parts.every(p => p.length <= 81), parts.map(p => p.length).join(","));
  assert.equal(parts.join(" ").replace(/\s+/g, " "), text);
  assert.deepEqual(L.chunks("A. B. C.", 200), ["A. B. C."]);
});

test("queue follows page order (group order, then concept order) and plays only the selection", () => {
  const all = new Set(L.keysOf(topic));
  assert.deepEqual(L.buildQueue([topic], all, opts).map(i => i.title), ["Second", "First", "Third"]);
  const some = new Set([L.key("t", 2)]);
  assert.deepEqual(L.buildQueue([topic], some, opts).map(i => i.title), ["Third"]);
  assert.deepEqual(L.buildQueue([topic], new Set(), opts), []);
});

test("repeat plays each selected concept n times in a row", () => {
  const q = L.buildQueue([topic], new Set([L.key("t", 0), L.key("t", 2)]), { ...opts, repeat: 3 });
  assert.deepEqual(q.map(i => i.title + i.pass), ["First1", "First2", "First3", "Third1", "Third2", "Third3"]);
  assert.equal(L.nextRepeat(1, [1, 2, 3]), 2);
  assert.equal(L.nextRepeat(3, [1, 2, 3]), 1);
});

test("parent checkboxes show all, some or none", () => {
  const groupA = L.keysOf(topic, "a");
  assert.deepEqual(groupA, ["t/0", "t/2"]);
  assert.equal(L.tri(groupA, new Set(["t/0", "t/2"])), "all");
  assert.equal(L.tri(groupA, new Set(["t/0"])), "some");
  assert.equal(L.tri(groupA, new Set(["t/1"])), "none");
});

test("previous restarts the item unless it just began; next stops at the end", () => {
  assert.equal(L.prevIndex(4, 5000, 2000), 4);
  assert.equal(L.prevIndex(4, 500, 2000), 3);
  assert.equal(L.prevIndex(0, 500, 2000), 0);
  assert.equal(L.following(1, 3), 2);
  assert.equal(L.following(2, 3), null);
});

test("English voices rank by quality, then preferred language, then on-device", () => {
  const cfg = { langPrefix: "en", preferredLangs: ["en-US", "en-GB"], quality: ["premium", "enhanced"] };
  const v = (name, lang, localService = true, voiceURI = name) => ({ name, lang, localService, voiceURI });
  const ranked = L.rankVoices([v("Mónica", "es-ES"), v("Daniel", "en-GB"), v("Fred", "en-US", false), v("Ava (Enhanced)", "en-US"), v("Zoe", "en_US")], cfg);
  assert.deepEqual(ranked.map(x => x.name), ["Ava (Enhanced)", "Zoe", "Fred", "Daniel"]);
});

test("speed falls back when the saved value is not offered", () => {
  assert.equal(L.clampSpeed([1, 1.25], 1.25, 1), 1.25);
  assert.equal(L.clampSpeed([1, 1.25], 3, 1), 1);
  assert.equal(L.clampSpeed([1, 1.25], "x", 1), 1);
});
