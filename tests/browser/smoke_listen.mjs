// Listen mode at phone width with a fake speech engine: node tests/browser/smoke_listen.mjs $PWD/web/mastery_field_guide.html shot.png
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.addInitScript(() => {
  window.__spoken = [];
  const voices = [{name:'Ava (Enhanced)',lang:'en-US',voiceURI:'ava',localService:true},{name:'Daniel',lang:'en-GB',voiceURI:'dan',localService:true},{name:'Mónica',lang:'es-ES',voiceURI:'mon',localService:true}];
  let cur=null;
  const s = { getVoices:()=>voices, speak(u){ cur=u; window.__spoken.push({t:u.text,rate:u.rate,v:u.voice&&u.voice.name}); setTimeout(()=>{ if(cur===u){cur=null; u.onend&&u.onend();}},5); },
    cancel(){ const u=cur; cur=null; if(u&&u.onerror) u.onerror({error:'interrupted'}); }, addEventListener(){}, onvoiceschanged:null };
  Object.defineProperty(window,'speechSynthesis',{value:s});
  window.SpeechSynthesisUtterance = function(t){ this.text=t; };
});
await p.goto('file://' + process.argv[2] + '#gtm'); await p.waitForTimeout(300);
await p.click('#modeListen'); await p.waitForTimeout(200);
console.log('total:', await p.textContent('#lTotal'));
console.log('voices:', await p.$$eval('#lVoice option', o=>o.map(x=>x.textContent)));
await p.click('#lSummary'); await p.click('#lRepeat');
console.log('now:', await p.textContent('#lNow'), '| repeat', await p.textContent('#lRepeatN'));
await p.click('#lPlay'); await p.waitForTimeout(300);
const sp = await p.evaluate(()=>window.__spoken);
console.log('spoken count', sp.length, sp.slice(0,3));
console.log('play label', await p.getAttribute('#lPlay','aria-label'));
await p.click('#lNone'); await p.waitForTimeout(100);
console.log('after none:', await p.textContent('#lTotal'), await p.getAttribute('#lPlay','aria-label'));
// select single concept by clicking a group then a concept
await p.click('.lgroup >> nth=0 >> summary .lname'); await p.waitForTimeout(100);
await p.click('.lconcept >> nth=1'); console.log('one:', await p.textContent('#lTotal'));
await p.click('#lNow'); console.log('nowlist', await p.$$eval('#lNowList button', x=>x.map(y=>y.textContent)));
console.log('scrollW', await p.evaluate(()=>document.documentElement.scrollWidth));
await p.screenshot({ path: process.argv[3], fullPage: false });
await p.reload(); await p.click('#modeListen'); console.log('persist:', await p.textContent('#lTotal'), await p.textContent('#lRepeatN'));
console.log('errors', errs); await b.close();
