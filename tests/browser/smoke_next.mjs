// Next mode: every topic ranked by last use; using a topic moves it to the bottom; the nav doesn't grow.
// Run: PWMOD=/path/to/node_modules/playwright node tests/browser/smoke_next.mjs "$PWD/web/mastery_field_guide.html"
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PWMOD);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const p = await b.newPage({ viewport: { width: 390, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const url = 'file://' + process.argv[2];
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) process.exitCode = 1; };
const lists = () => p.evaluate(() => ({
  next: [...document.querySelectorAll('#nextList button')].map(x => x.dataset.id + ':' + x.querySelector('.ag').textContent),
  fresh: [...document.querySelectorAll('#freshList button')].map(x => x.dataset.id) }));

await p.goto(url); await p.waitForTimeout(400);
const oneRow = await p.evaluate(() => { const m = document.querySelector('.modes'); return m.offsetHeight <= m.querySelector('button').offsetHeight + 2; });
check(oneRow, 'mode buttons (Read, Study, Listen, Next) stay on one row at phone width');

await p.click('#modeNext'); await p.waitForTimeout(150);
let l = await lists();
const built = await p.evaluate(() => NX_IDS.length);
check(l.next.length === 0 && l.fresh[0] === 'fundamentals' && l.fresh.length === built && built >= 14, 'fresh: nothing started, all ' + built + ' built topics under Not started');
check(await p.isHidden('#topicNote') && await p.isHidden('#nextHead'), 'topic note and empty Review heading hidden');

// Landing on a topic doesn't count; opening a concept does.
await p.click('#modeRead'); await p.click('.tab[data-id="git"]'); await p.waitForTimeout(100);
await p.click('#modeNext'); l = await lists();
check(l.next.length === 0, 'switching to Git alone is not a use');
await p.click('#modeRead'); await p.click('#list details.concept summary'); await p.waitForTimeout(100);
await p.click('#modeNext'); l = await lists();
check(l.next.join() === 'git:today' && !l.fresh.includes('git'), 'opening a Git concept starts Git ' + JSON.stringify(l.next));

// Older uses rank first; stamps survive a reload.
await p.evaluate(() => { const r = JSON.parse(localStorage.getItem('fieldguide-recent')); r.eq = Date.now() - 30 * 864e5; r.databricks = Date.now() - 12 * 864e5; localStorage.setItem('fieldguide-recent', JSON.stringify(r)); });
await p.reload(); await p.waitForTimeout(400); await p.click('#modeNext'); await p.waitForTimeout(100);
l = await lists();
check(l.next.join() === 'eq:30d ago,databricks:12d ago,git:today', 'ranked oldest first ' + JSON.stringify(l.next));
check((await p.textContent('#nextList li:first-child .rk')) === '1', 'rows are numbered');

// Tapping a row opens that topic in Read.
await p.click('#nextList button[data-id="databricks"]'); await p.waitForTimeout(150);
check(await p.evaluate(() => ui.topic === 'databricks' && ui.mode === 'read'), 'tapping a row opens it in Read');

// Grading a card counts, and due cards show.
await p.click('#modeStudy'); await p.waitForTimeout(300); await p.click('#showBtn'); await p.click('button:has-text("Again")'); await p.waitForTimeout(200);
await p.click('#modeNext'); l = await lists();
check(l.next[l.next.length - 1].startsWith('databricks:today'), 'grading a Databricks card moves it to the bottom ' + JSON.stringify(l.next));
await p.evaluate(() => { const k = CARDS.databricks[0]; srs.databricks.cards[k.id].due = Date.now() - 1000; renderNext(); });
check((await p.textContent('#nextList button[data-id="databricks"] .ag')).includes('1 due'), 'due cards shown on the row');

// The nav is the same height in every mode and category.
for (const c of await p.$$eval('.cat', x => x.map(t => t.dataset.key))) {
  await p.click(`.cat[data-key="${c}"]`); await p.waitForTimeout(50);
  const hs = [];
  for (const m of ['#modeRead', '#modeNext']) { await p.click(m); hs.push(await p.evaluate(() => document.querySelector('.bar').offsetHeight)); }
  check(hs[0] === hs[1], `${c}: nav height Read ${hs[0]} = Next ${hs[1]}`);
}
await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: 'shot-next.png' });
check(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
await b.close();
