// Recorded Listen playback (repeat, pause, next). Serve a folder holding the page as index.html plus audio/ on :8765 first.
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 390, height: 860 } });
const errs=[]; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8765/#gtm'); await p.waitForTimeout(400);
await p.click('#modeListen'); await p.click('#lSummary'); await p.click('#lNone');
await p.click('.lgroup >> nth=0 >> summary .lname'); await p.click('.lconcept >> nth=0'); await p.click('.lconcept >> nth=1');
await p.click('#lRepeat'); await p.selectOption('#lSpeed', '2'); await p.click('#lPlay');
for (let i=0;i<8;i++){ await p.waitForTimeout(2000); console.log(await p.textContent('#lNow')); }
await p.click('#lPlay'); const t1 = await p.textContent('#lNow'); await p.waitForTimeout(1500); console.log('paused label', await p.getAttribute('#lPlay','aria-label'), t1===await p.textContent('#lNow'));
await p.click('#lNext'); console.log('next ->', await p.textContent('#lNow'));
console.log(errs); await b.close();
