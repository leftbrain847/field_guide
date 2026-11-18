// Next mode x Listen: a topic counts as used only once sound actually starts (a silent device voice must not reset it).
// Run: PWMOD=/path/to/node_modules/playwright node tests/browser/smoke_next_listen.mjs "$PWD/web/mastery_field_guide.html"
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PWMOD);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const p = await b.newPage({ viewport: { width: 390, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) process.exitCode = 1; };
await p.addInitScript(() => {
  window.__speakOk = false;   // false: the engine accepts speak() but never starts (as the Claude app can)
  const voices = [{ name: 'Ava (Enhanced)', lang: 'en-US', voiceURI: 'ava', localService: true }];
  let cur = null;
  const s = { getVoices: () => voices, speaking: false, pending: false, paused: false,
    speak(u) { cur = u; if (window.__speakOk) setTimeout(() => { if (cur === u) { u.onstart && u.onstart(); setTimeout(() => { if (cur === u) { cur = null; u.onend && u.onend(); } }, 5); } }, 5); },
    cancel() { const u = cur; cur = null; if (u && u.onerror) u.onerror({ error: 'interrupted' }); }, resume() {}, addEventListener() {}, onvoiceschanged: null };
  Object.defineProperty(window, 'speechSynthesis', { value: s });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
});
const stamp = () => p.evaluate(() => (JSON.parse(localStorage.getItem('fieldguide-recent') || '{}')).gtm || 0);
await p.goto('file://' + process.argv[2] + '#gtm'); await p.waitForTimeout(300);
await p.click('#modeListen'); await p.click('#lFull'); await p.click('#lAll');
await p.click('#lPlay'); await p.waitForTimeout(400); await p.click('#lPlay');
check((await stamp()) === 0, 'silent device voice: Go-to-market not counted');
await p.evaluate(() => { window.__speakOk = true; });
await p.click('#lPlay'); await p.waitForTimeout(400); await p.click('#lPlay');
check((await stamp()) > 0, 'speech started: Go-to-market counted');
check(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
await b.close();
