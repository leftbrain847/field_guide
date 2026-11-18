// Listen in Español: Spanish summaries spoken by the best Spanish device voice; English stays as it was.
// Run: PWMOD=/path/to/node_modules/playwright [MAIN_PAGE=/tmp/main.html] node tests/browser/smoke_listen_es.mjs "$PWD/web/mastery_field_guide.html"
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PWMOD);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const p = await b.newPage({ viewport: { width: 390, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) process.exitCode = 1; };
await p.addInitScript(() => {
  window.__spoken = [];
  const voices = [{ name: 'Ava (Enhanced)', lang: 'en-US', voiceURI: 'ava', localService: true },
    { name: 'Mónica', lang: 'es-ES', voiceURI: 'mon', localService: true },
    { name: 'Paulina (Enhanced)', lang: 'es-MX', voiceURI: 'pau', localService: true }];
  let cur = null;
  const s = { getVoices: () => voices, speaking: false, pending: false, paused: false,
    speak(u) { cur = u; window.__spoken.push({ t: u.text, v: u.voice && u.voice.name, lang: u.lang });
      setTimeout(() => { if (cur === u) { u.onstart && u.onstart(); setTimeout(() => { if (cur === u) { cur = null; u.onend && u.onend(); } }, 5); } }, 5); },
    cancel() { const u = cur; cur = null; if (u && u.onerror) u.onerror({ error: 'interrupted' }); }, resume() {}, addEventListener() {}, onvoiceschanged: null };
  Object.defineProperty(window, 'speechSynthesis', { value: s });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
});
await p.goto('file://' + process.argv[2] + '#gtm'); await p.waitForTimeout(300);
await p.click('#modeListen');
await p.click('#lEs'); await p.waitForTimeout(100);
const vs = await p.$$eval('#lVoice option', o => o.map(x => x.textContent));
check(vs[0] === 'Paulina (Enhanced) (es-MX)' && vs.length === 2, 'Español lists Spanish voices, best first ' + JSON.stringify(vs));
await p.click('#lAll'); await p.click('#lPlay'); await p.waitForTimeout(300); await p.click('#lPlay');
const sp = await p.evaluate(() => window.__spoken);
check(sp.length > 0 && sp[0].t.startsWith('El mapa de los modelos de venta.') && sp[0].v === 'Paulina (Enhanced)' && sp[0].lang === 'es-MX', 'speaks the Spanish summary in the Spanish voice ' + JSON.stringify(sp[0]));
check(await p.evaluate(() => JSON.parse(localStorage.getItem('fieldguide-listen')).content === 'es'), 'Español is remembered');
await p.click('#lSummary'); await p.waitForTimeout(100);
check((await p.$$eval('#lVoice option', o => o.map(x => x.textContent)))[0] === 'Ava (Enhanced) (en-US)', 'back to Summaries lists English voices');
// The Listen view must not get taller than main's (hint plus options), at the owner's widths. MAIN_PAGE = main's build.
if (process.env.MAIN_PAGE) for (const w of [320, 375, 390, 428]) {
  const hs = [];
  for (const f of [process.env.MAIN_PAGE, process.argv[2]]) {
    const q = await b.newPage({ viewport: { width: w, height: 860 } });
    await q.goto('file://' + f + '#gtm'); await q.waitForTimeout(200); await q.click('#modeListen');
    hs.push(await q.evaluate(() => document.getElementById('lHint').offsetHeight + document.querySelector('.lopts').offsetHeight)); await q.close();
  }
  check(hs[1] <= hs[0], `${w}px: Listen hint and options ${hs[1]}px vs main ${hs[0]}px`);
}
check(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
await b.close();
