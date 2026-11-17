import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PWMOD);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
const p = await b.newPage({ viewport: { width: 390, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const goCat = async sel => { if (await p.isVisible('#homeBtn')) await p.click('#homeBtn'); await p.click(sel); };
await p.goto('file://' + process.argv[2] + '#databricks'); await p.waitForTimeout(500);
const state = async () => [await p.$$eval('.cat', x => x.map(t => t.textContent + (t.getAttribute('aria-selected')==='true'?'*':''))), await p.$$eval('.tab', x => x.map(t => t.textContent + (t.getAttribute('aria-selected')==='true'?'*':'')))];
console.log(JSON.stringify(await state()));
for (const c of await p.$$eval('.cat', x => x.map(t => t.dataset.key))) {
  await goCat(`.cat[data-key="${c}"]`); await p.waitForTimeout(100);
  for (const id of await p.$$eval(".tab:not(.planned)", x => x.map(t => t.dataset.id))) {
    await p.click(`.tab[data-id="${id}"]`); await p.click('#openAll'); await p.waitForTimeout(80);
    console.log(c, id, 'w', await p.evaluate(() => document.documentElement.scrollWidth), await p.textContent('#topicNote .meta span'));
    await p.click('#closeAll');
  }
}
await goCat('.cat[data-key="data"]'); await p.click('#modeStudy');
for (const s of ['topic','category','all']) { await p.selectOption('#scope', s); console.log(s, await p.textContent('.stats')); }
await p.evaluate(()=>scrollTo(0,0)); await p.screenshot({ path: 'shot-cats.png' });
console.log('errors', errs); await b.close();
