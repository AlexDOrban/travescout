// Walks the main booking flow on the Expo *web* build in headless Chrome
// (Chrome DevTools Protocol, no extra deps) and saves a screenshot per step.
// Useful because taps can't be scripted into the iOS simulator here.
//
// Prereqs: backend on :3000 (demo user seeded), Metro on :8081
// (`EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start --clear`).
// Usage: node scripts/web-walkthrough.mjs <outDir> [light|dark] [oneway|roundtrip]
// Note: the Pay step returns 402 unless backend/.env has a real sk_test key.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';

const OUT = process.argv[2];
const SCHEME = process.argv[3] ?? 'light';
const FLOW = process.argv[4] ?? 'oneway';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${OUT}/profile-${SCHEME}`, 'about:blank',
], { stdio: 'ignore' });

let ws;
let id = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const msg = { id: ++id, method, params };
    pending.set(msg.id, { resolve, reject });
    ws.send(JSON.stringify(msg));
  });
}
const evaluate = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
};
async function shot(name) {
  await sleep(700);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${SCHEME}-${FLOW}-${name}.png`, Buffer.from(data, 'base64'));
  console.log('shot', name);
}
async function waitFor(testId, timeout = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await evaluate(`!!document.querySelector('[data-testid="${testId}"]')`)) return;
    await sleep(250);
  }
  throw new Error(`timeout waiting for ${testId}`);
}
async function click(testId) {
  await waitFor(testId);
  await evaluate(`[...document.querySelectorAll('[data-testid="${testId}"]')].pop().click()`);
  await sleep(400);
}
async function type(testId, text) {
  await waitFor(testId);
  // React-controlled input: use the native setter then dispatch input.
  await evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-testid="${testId}"]')].pop();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(text)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(300);
}

try {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      target = list.find(t => t.type === 'page');
    } catch { await sleep(250); }
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p.reject(new Error(m.error.message));
      else p.resolve(m.result);
    }
  };
  await new Promise(r => (ws.onopen = r));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: SCHEME }] });

  const login = await (await fetch('http://localhost:3000/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@travescout.app', password: 'demo12345' }),
  })).json();

  await send('Page.navigate', { url: 'http://localhost:8081/' });
  await sleep(4000);
  await evaluate(`localStorage.setItem('accessToken', ${JSON.stringify(login.accessToken)});
    localStorage.setItem('refreshToken', ${JSON.stringify(login.refreshToken)});
    localStorage.setItem('userEmail', 'demo@travescout.app'); true`);
  await send('Page.navigate', { url: 'http://localhost:8081/' });

  await waitFor('search-btn', 30000);
  await shot('01-search');

  await click('from-city');
  await type('from-picker-input', 'Lon');
  await shot('02-city-picker');
  await click('from-picker-option-LON');
  await type('to-picker-input', 'Par');
  await click('to-picker-option-PAR');
  if (FLOW === 'roundtrip') await click('trip-type-return');
  await click('depart-date');
  await shot('03-calendar');
  await click('calendar-week');
  await shot('04-search-filled');

  await click('search-btn');
  await sleep(400);
  await shot('05-results-loading');
  await waitFor('results-list', 20000);
  await sleep(1500);
  await shot('06-results');

  await click('watch-price');
  await shot('07-watch-toast');

  // Expo web keeps earlier stack screens in the DOM: always take the last match.
  const pickFirstTrip = () =>
    evaluate(`[...document.querySelectorAll('[data-testid^="trip-"]:not([data-testid="trip-skeleton"])')].pop().getAttribute('data-testid')`);

  await click(await pickFirstTrip());
  if (FLOW === 'roundtrip') {
    await waitFor('choose-return-btn');
    await shot('08-outbound-detail');
    await click('choose-return-btn');
    await waitFor('outbound-summary', 20000);
    await waitFor('results-list', 20000);
    await sleep(1500);
    await shot('08b-return-results');
    await click(await pickFirstTrip());
    await waitFor('book-round-trip-btn');
    await shot('08c-return-detail');
    await click('add-connections-btn');
    await sleep(3000);
    await shot('08d-outbound-connections');
    await click('continue-btn');
    await sleep(3000);
    await shot('08e-return-connections');
    await click('continue-btn');
  } else {
    await waitFor('book-btn');
    await shot('08-trip-detail');
    await click('book-btn');
  }
  await waitFor('transfer-continue');
  await shot('09-transfer');
  await click('transfer-skip');
  await waitFor('next-btn');
  await type('name-0', 'Demo Traveller');
  await shot('10-passengers');
  await click('next-btn');
  await waitFor('pay-btn');
  await shot('11-review');
  await click('pay-btn');
  await waitFor('card-number');
  await type('card-number', '4242 4242 4242 4242');
  await type('card-expiry', '12/30');
  await type('card-cvc', '123');
  await shot('12-payment');
  await click('pay-btn');
  await sleep(4000);
  await shot('13-after-pay');
  console.log('error text:', await evaluate(`[...document.querySelectorAll('[data-testid="error"]')].map(e => e.textContent).join(' | ')`));

  await send('Page.navigate', { url: 'http://localhost:8081/trips' });
  await sleep(5000);
  await shot('14-trips');
  await send('Page.navigate', { url: 'http://localhost:8081/alerts' });
  await sleep(5000);
  await shot('15-alerts');
  await send('Page.navigate', { url: 'http://localhost:8081/profile' });
  await sleep(4000);
  await shot('16-account');
} catch (e) {
  console.error('FAILED:', e.message);
  try { await shot('zz-failure'); } catch {}
  process.exitCode = 1;
} finally {
  ws?.close();
  chrome.kill();
}
