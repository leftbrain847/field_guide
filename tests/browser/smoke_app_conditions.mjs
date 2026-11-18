// Claude-app conditions: fresh visit, page in a sandboxed iframe, device speech that never sounds. Pressing play must
// start the recording. Serve a folder with the page as index.html, frame.html (below) and audio/ on :8765.
// frame.html: <iframe id="f" src="index.html#bookshelf" sandbox="allow-scripts allow-same-origin" allow="autoplay"></iframe>
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 860 } });
// The Claude app: speech "starts" (speaking=true) but makes no sound and never ends.
await ctx.addInitScript(() => { const s = { speaking:false, pending:false, paused:false, getVoices:()=>[], speak(){ this.speaking=true; }, cancel(){ this.speaking=false; }, resume(){}, addEventListener(){} }; Object.defineProperty(window,'speechSynthesis',{value:s}); window.SpeechSynthesisUtterance=function(t){this.text=t;}; });
const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(e.message));
await p.goto('http://localhost:8765/frame.html'); await p.waitForTimeout(800);
const f = p.frameLocator('#f');
await f.locator('#modeListen').click(); await f.locator('#lPlay').click(); await p.waitForTimeout(3000);
const st = await p.frames()[1].evaluate(() => ({ content: document.getElementById('lSummary').getAttribute('aria-pressed'), t: player.currentTime, paused: player.paused, src: player.src.split('/').slice(-2).join('/'), now: document.getElementById('lNow').textContent }));
console.log(JSON.stringify(st), errs); await b.close();
