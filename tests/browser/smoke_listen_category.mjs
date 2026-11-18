// Listen plays only what is ticked in the category on screen. Serve the page as index.html plus audio/ on :8765.
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 390, height: 860 } });
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(500);
await p.click('#modeListen'); console.log('data:', await p.textContent('#lTotal'));
await p.click('.cat[data-key="mind"]'); await p.waitForTimeout(200);
console.log('mind:', await p.textContent('#lTotal'), '| play disabled:', await p.isDisabled('#lPlay'));
await p.click('.ltopic >> nth=0 >> summary input'); console.log('mind ticked:', await p.textContent('#lTotal'));
await p.click('#lPlay'); await p.waitForTimeout(1500); console.log('now:', await p.textContent('#lNow'));
await p.click('.cat[data-key="data"]'); await p.waitForTimeout(200); console.log('back to data while playing, now:', await p.textContent('#lNow'), '|', await p.textContent('#lTotal'));
console.log(errs); await b.close();
