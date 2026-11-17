import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PWMOD);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const goCat = async sel => { if (await p.isVisible('#homeBtn')) await p.click('#homeBtn'); await p.click(sel); };
await p.goto('file://' + process.argv[2]); await p.waitForTimeout(400);
for (const c of await p.$$eval('.cat', x => x.map(t => t.dataset.key))) {
  await goCat(`.cat[data-key="${c}"]`); await p.waitForTimeout(80);
  console.log(c, JSON.stringify(await p.$$eval('.tab', x => x.map(t => t.textContent + (t.classList.contains('planned') ? '(p)' : '')))));
}
await goCat('.cat[data-key="law"]'); await p.waitForTimeout(80);
console.log('law note:', await p.textContent('#topicNote'), '| list:', await p.textContent('#list'));
await p.click('#modeStudy'); console.log('law study:', await p.textContent('#doneText'));
await p.selectOption('#scope', 'all'); console.log('all:', await p.textContent('.stats'));
await p.click('#modeRead'); await goCat('.cat[data-key="games"]'); await p.click('.tab[data-id="poker"]');
console.log('w', await p.evaluate(() => document.documentElement.scrollWidth));
await p.evaluate(()=>scrollTo(0,0)); await p.screenshot({ path: 'shot-skel.png' });
console.log('errors', errs); await b.close();
