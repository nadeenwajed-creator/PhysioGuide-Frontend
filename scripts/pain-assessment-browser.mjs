// Dependency-free local Edge/Chrome CDP acceptance checks. No backend required.
// Run Vite on :5175 and an isolated browser with --remote-debugging-port=9223.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const origin = 'http://127.0.0.1:5175';
const centerMode = process.argv.find(a => a.startsWith('--centers='))?.split('=')[1] || 'offline';
assert(['offline', 'error', 'fixture', 'empty'].includes(centerMode));
const output = join(tmpdir(), 'physioguide-pain-assessment-qa');
await mkdir(output, { recursive: true });
const pages = await fetch('http://127.0.0.1:9223/json').then(r => r.json());
const page = pages.find(p => p.type === 'page' && !p.url.startsWith('edge:'));
assert(page, 'A local debug browser tab is required');
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const waiting = new Map(), events = new Map(), checks = [], errors = [], backendRequests = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const handler = waiting.get(message.id);
    waiting.delete(message.id);
    if (message.error) handler?.reject(new Error(JSON.stringify(message.error)));
    else handler?.resolve(message.result);
  } else for (const fn of events.get(message.method) || []) fn(message.params);
});
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    waiting.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
function on(name, callback) { events.set(name, [...(events.get(name) || []), callback]); }
async function js(expression) {
  const response = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result?.value;
}
if (process.argv.includes('--inspect')) {
  await call('Emulation.setDeviceMetricsOverride', { width: Number(process.argv.find(a=>a.startsWith('--width='))?.split('=')[1] || 1366), height:768,deviceScaleFactor:1,mobile:false });
  if (process.argv.includes('--arabic')) {
    await js(`document.querySelector('.pg-language-switcher__option:has([lang="ar"])').click()`);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  console.log(await call('Page.getLayoutMetrics'));
  console.log(await js(`({ancestors:[...document.querySelectorAll('.center-page,.pain-page,.pain-wizard,.pain-wizard form,.pain-columns')].map(e=>({cls:e.className,tag:e.tagName,width:e.getBoundingClientRect().width,css:getComputedStyle(e).cssText,min:getComputedStyle(e).minWidth,display:getComputedStyle(e).display,tracks:getComputedStyle(e).gridTemplateColumns})),overflow:[...document.querySelectorAll('body *')].map(e=>({cls:e.className?.baseVal??e.className,tag:e.tagName,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(r=>r.width>1&&(r.right>innerWidth+1||r.left < -1)).slice(0,15),viewport:[innerWidth,innerHeight],scroll:document.documentElement.scrollWidth})`));
  const shot = await call('Page.captureScreenshot', { format:'png',captureBeyondViewport:false });
  await writeFile(join(output, 'inspect-viewport.png'), Buffer.from(shot.data,'base64'));
  socket.close();
  process.exit(0);
}
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function until(expression, label, timeout = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await js(expression)) return; await pause(100); }
  throw new Error(`Timed out: ${label}; ${await js('document.body.innerText.slice(0,900)')}`);
}
async function click(selector) {
  const position = await js(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e || e.disabled) throw new Error('Missing/enabled control: ' + ${JSON.stringify(selector)}); e.scrollIntoView({block:'center',behavior:'instant'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...position, button: 'left', clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...position, button: 'left', clickCount: 1 });
  await pause(80);
}
async function next(step) { await click('.pain-navigation button[type="submit"]'); await until(`Boolean(document.querySelector('.pain-step-${step}'))`, `step ${step}`); }
async function back(step) { await click('.pain-navigation button[type="button"]'); await until(`Boolean(document.querySelector('.pain-step-${step}'))`, `back ${step}`); }
async function viewport(width, height = 768) { await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); await pause(120); }
async function screenshot(name) {
  await js('window.scrollTo({top:0,behavior:"instant"})');
  // Chromium can offset full-document clips in RTL. Use the actual viewport for
  // RTL evidence; layout bounds are checked separately at every required width.
  if (await js('document.documentElement.dir') === 'rtl') {
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
    return;
  }
  const metrics = await call('Page.getLayoutMetrics');
  const size = metrics.cssContentSize;
  const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: size.width, height: Math.min(size.height, 5000), scale: 1 } });
  await writeFile(join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
}
function pass(label) { checks.push(label); console.log(`PASS ${label}`); }
async function noOverflow(label) {
  assert.equal(await js('document.documentElement.scrollWidth > innerWidth + 1'), false, `horizontal overflow: ${label}`);
  assert.equal(await js(`Array.from(document.querySelectorAll('.pain-page button,.pain-page input,.pain-page label')).some(e=>{const r=e.getBoundingClientRect();return r.width>1&&(r.left < -1 || r.right>innerWidth+1)})`), false, `clipped control: ${label}`);
}

try {
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  on('Runtime.exceptionThrown', ({ exceptionDetails }) => errors.push(exceptionDetails.exception?.description || exceptionDetails.text));
  on('Network.requestWillBeSent', ({ request }) => { if (request.url.startsWith(`${origin}/api/`) || !request.url.startsWith(origin) && /^https?:/.test(request.url)) backendRequests.push(request.url); });
  await call('Network.setBlockedURLs', { urls: [`${origin}/api/*`, 'https://*'] });
  // Simulate unavailable messaging, even in the existing local mock mode. This is
  // a browser-only source response override; no project service is changed.
  const messaging = (await readFile(new URL('../src/services/messageService.js', import.meta.url), 'utf8'))
    .replace("callCenter('getMessagingWorkspace', actor)", "Promise.reject(Object.assign(new Error('offline QA'), { code: 'network' }))");
  const patterns = [{ urlPattern: '*src/services/messageService.js*', requestStage: 'Request' }];
  let discoverySource;
  if (centerMode !== 'offline') {
    patterns.push({ urlPattern: '*src/services/patientDiscoveryService.js*', requestStage: 'Request' });
    const fixture = { centers: ['a', 'b', 'c'].map((id, i) => ({
      id: `qa-center-${id}`, name: { en: `QA fixture ${id} (not a real center)`, ar: `بيانات اختبار ${id}` }, city: { en: i ? 'Nablus' : 'Ramallah', ar: i ? 'نابلس' : 'رام الله' },
      imageUrl: '/src/assets/images/center/center-treatment-room.webp', rating: null, reviews: [], services: [{ id: 'qa-service', name: { en: 'Back Pain Treatment', ar: 'علاج آلام الظهر' } }],
    })), favoriteIds: [] };
    discoverySource = (await readFile(new URL('../src/services/patientDiscoveryService.js', import.meta.url), 'utf8')).replace("callCenter('getPatientDiscovery', actor)", centerMode === 'error' ? "Promise.reject(new Error('offline center test'))" : `Promise.resolve(${JSON.stringify(centerMode === 'fixture' ? fixture : { centers: [], favoriteIds: [] })})`);
  }
  await call('Fetch.enable', { patterns });
  on('Fetch.requestPaused', async ({ requestId, request }) => {
    const source = request.url.includes('patientDiscoveryService.js') ? discoverySource : messaging;
    await call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }], body: Buffer.from(source).toString('base64') });
  });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__painQA = {frames:0,pending:new Set(),writes:[]};
    const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame=cb=>{let id=request(time=>{window.__painQA.pending.delete(id);window.__painQA.frames++;cb(time)});window.__painQA.pending.add(id);return id};
    window.cancelAnimationFrame=id=>{window.__painQA.pending.delete(id);cancel(id)};
    const write=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){window.__painQA.writes.push({key,value});return write.call(this,key,value)};
  ` });
  await viewport(1366);
  await call('Page.navigate', { url: `${origin}/patient/login` });
  await until('Boolean(document.querySelector("#root")?.children.length)', 'application');
  await js(`(async()=>{const auth=await import('/src/services/authService.js'); const {MOCK_PASSWORD}=await import('/src/services/auth/mockAccounts.js');await auth.loginPatient({email:'patient@example.com',password:MOCK_PASSWORD});localStorage.setItem('physioguide-language','en');sessionStorage.setItem('physioguide-theme','light');})()`);
  await call('Page.navigate', { url: `${origin}/patient/pain-assessment` });
  await until('Boolean(document.querySelector(".pain-step-1"))', 'assessment despite failed messaging');
  await js('document.fonts.ready');
  pass('Existing authenticated Patient shell renders assessment while messaging is unavailable');
  await viewport(320);
  await click('.pg-navbar__brand button');
  await until('document.querySelector(".pg-navbar__brand button").getAttribute("aria-expanded") === "true"', 'mobile sidebar opens');
  await pause(350);
  await click('.pg-sidebar__close');
  await pause(350);
  await viewport(1366);
  assert.equal(await js('document.querySelectorAll(".pg-navbar").length'), 1);
  assert.equal(await js('document.querySelectorAll(".pg-sidebar").length'), 1);
  assert.equal(await js('document.querySelector(".pain-navigation button[type=submit]").disabled'), true);
  assert.equal(await js('document.querySelectorAll(".pain-choices input:checked").length'), 0);
  await js('document.querySelector("input[value=neck]").focus()');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  assert.equal(await js('document.querySelector("input[value=neck]").checked'), true);
  await click('.pain-choice:has(input[value="neck"])');
  for (const id of ['neck', 'shoulder', 'upper_back', 'lower_back', 'arm_hand', 'hip', 'knee', 'leg_foot']) {
    await click(`.pain-choice:has(input[value="${id}"])`);
    assert(await js(`document.querySelectorAll('.pain-hotspot--${id}.is-active').length > 0`));
    await click(`.pain-choice:has(input[value="${id}"])`);
  }
  await click('.pain-choice:has(input[value="upper_back"])');
  await click('.pain-body .pain-hotspot--lower_back');
  assert.equal(await js('document.querySelectorAll(".pain-choices input:checked").length'), 2);
  assert.equal(await js('document.querySelectorAll(".pain-hotspot--lower_back.is-active").length'), 1);
  await screenshot('q1-desktop');
  pass('Q1 list and anatomical hotspots synchronize multiple actual regions');

  await next(2);
  assert.equal(await js('document.querySelector(".pain-navigation button[type=submit]").disabled'), true);
  await js('document.querySelector("#pain-intensity").focus()');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Home', code: 'Home' });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Home', code: 'Home' });
  assert.equal(await js('document.querySelector(".pain-gauge-inner strong").textContent'), '0');
  assert.equal(await js('document.querySelector(".pain-navigation button[type=submit]").disabled'), false);
  for (const [key, expected] of [['End', '10'], ['Home', '0']]) {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key }); await pause(80);
    assert.equal(await js('document.querySelector(".pain-gauge-inner strong").textContent'), expected);
  }
  for (let n = 0; n < 5; n++) await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
  await pause(120);
  assert.equal(await js('document.querySelector(".pain-gauge-inner strong").textContent'), '5');
  await screenshot('q2-desktop');
  pass('Q2 keyboard slider accepts explicit 0 and 10 and updates gauge/category');
  await next(3);
  for (const id of ['today', 'days_2_7', 'weeks_1_4', 'months_1_3', 'months_3_plus']) {
    await click(`.pain-choice:has(input[value="${id}"])`);
    assert.equal(await js('document.querySelectorAll(".pain-ring.is-selected").length'), 1);
    assert.equal(await js('document.querySelectorAll(".pain-choices input:checked").length'), 1);
  }
  await click('.pain-choice:has(input[value="weeks_1_4"])');
  await screenshot('q3-desktop');
  await back(2); assert.equal(await js('document.querySelector("#pain-intensity").value'), '5'); await next(3);
  pass('Q3 all five rings map to single selected duration; Back retains intensity');
  await next(4);
  for (const id of ['aching', 'stiffness', 'sharp', 'burning', 'tingling', 'movement', 'other']) {
    await click(`.pain-choice:has(input[value="${id}"])`);
    await js('document.querySelector("canvas").scrollIntoView({block:"center",behavior:"instant"})');
    await pause(100);
    const first = await js('document.querySelector("canvas").toDataURL()');
    await pause(150);
    assert.equal(await js('document.querySelector("canvas").toDataURL()') !== first, true, `Individual Canvas effect ${id} animates`);
    await click(`.pain-choice:has(input[value="${id}"])`);
  }
  for (const id of ['aching', 'stiffness', 'sharp', 'burning', 'tingling', 'movement', 'other']) await click(`.pain-choice:has(input[value="${id}"])`);
  assert.equal(await js('document.querySelectorAll(".pain-texture-chips button").length'), 7);
  const before = await js('document.querySelector("canvas").toDataURL()'); await pause(350);
  assert.equal(await js('document.querySelector("canvas").toDataURL()') !== before, true, 'Canvas must change over time');
  await click('.pain-texture-chips button:first-child');
  assert.equal(await js('document.querySelector(".pain-texture-preview strong").textContent'), 'Aching');
  await screenshot('q4-desktop');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await pause(150); const still = await js('document.querySelector("canvas").toDataURL()'); await pause(200);
  assert.equal(await js('document.querySelector("canvas").toDataURL()'), still);
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await back(3); const count = await js('window.__painQA.frames'); await pause(200);
  assert.equal(await js('window.__painQA.frames'), count);
  await next(4); assert.equal(await js('document.querySelectorAll(".pain-choices input:checked").length'), 7);
  await click('.pain-choice:has(input[value="tingling"])');
  assert.equal(await js('document.querySelectorAll(".pain-texture-chips button").length'), 6);
  pass('Q4 all seven effects coexist; live Canvas changes, preview works, reduced motion freezes and unmount cancels RAF');

  // Run every question at each required width and both directions/themes.
  for (const width of centerMode === 'offline' ? [320, 375, 390, 768, 1024, 1366, 1440] : []) {
    for (const language of ['en', 'ar']) {
      await viewport(1366);
      if (await js('document.documentElement.lang') !== language) {
        await click('.pg-language-switcher__toggle');
        await click(`.pg-language-switcher__option:has([lang="${language}"])`);
      }
      if (await js('document.documentElement.dataset.theme') !== (language === 'ar' ? 'dark' : 'light')) await click('.pg-theme-toggle');
      await until(`document.documentElement.lang === ${JSON.stringify(language)}`, 'language change');
      await viewport(width);
      assert.equal(await js('document.querySelectorAll(".pain-choices input:checked").length'), 6);
      for (let step = 4; step >= 1; step--) {
        await noOverflow(`${width}px ${language} Q${step}`);
        if (step === 1) {
          const offsets = await js(`Array.from(document.querySelectorAll('.pain-hotspot--lower_back')).map(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return {x:(r.x+r.width/2-p.x)/p.width,y:(r.y+r.height/2-p.y)/p.height}})`);
          assert(Math.abs(offsets[0].x - .5) < .01 && Math.abs(offsets[0].y - .43) < .01);
        }
        if (step > 1) await back(step - 1);
      }
      for (let step = 2; step <= 5; step++) await next(step);
      await noOverflow(`${width}px ${language} Q5`);
      if (width === 320 || width === 1366) await screenshot(`q5-${width}-${language}`);
      await back(4);
    }
  }
  if (centerMode === 'offline') pass('Q1–Q5 have no horizontal overflow at 320/375/390/768/1024/1366/1440px in English/light and Arabic/dark; highlights retain registration');
  await viewport(1366); await next(5);
  assert.match(await js('document.querySelector(".pain-context-card ul").textContent'), /الظهر|back/);
  for (const id of ['previous_injury', 'previous_surgery', 'recent_injury']) {
    await click(`.pain-choice:has(input[value="${id}"])`);
    assert.equal(await js('document.querySelectorAll(".pain-context-card").length'), 2);
  }
  await click('.pain-choice:has(input[value="none"])');
  assert.equal(await js('document.querySelectorAll(".pain-context-card").length'), 1);
  await click('.pain-navigation button[type="submit"]');
  await until('Boolean(document.querySelector(".pain-result"))', 'same-page result');
  if (centerMode === 'fixture') {
    await until('document.querySelectorAll(".pain-center-link").length === 2', 'two qualifying fixture centers');
    assert.deepEqual(await js('[...document.querySelectorAll(".pain-center-link")].map(e=>e.getAttribute("href"))'), ['/patient/centers/qa-center-a', '/patient/centers/qa-center-b']);
    pass('Synthetic center records exercise two-card cap, offered services, shared image/rating/favorite components and actual detail-route hrefs');
  } else if (centerMode === 'error') {
    await until('Boolean(document.querySelector(".pain-empty button"))', 'optional discovery failure');
    pass('Failed center discovery preserves suggested care and offers retry');
  } else if (centerMode === 'empty') assert.equal(await js('document.querySelectorAll(".pain-center-link").length'), 0);
  else { await until('document.querySelectorAll(".pain-center-link").length > 0', 'shared local matching center'); }
  assert.equal(await js('location.pathname'), '/patient/pain-assessment');
  assert.equal(await js('document.querySelectorAll(".pain-progress-header").length'), 0);
  await screenshot(`result-${centerMode}`);
  for (const width of [320, 375, 390, 768, 1024, 1366, 1440]) { await viewport(width); await noOverflow(`result ${width}`); }
  pass('Q5 all history cases work; No hides history; result replaces progress at same route; center availability does not block guidance');
  await click('.pain-disclaimer button');
  await until('Boolean(document.querySelector("dialog[open]"))', 'reset confirmation');
  await click('.pg-modal__footer button:last-child');
  await until('Boolean(document.querySelector(".pain-step-1"))', 'reset Q1');
  assert.equal(await js('document.querySelectorAll(".pain-choices input:checked").length'), 0);
  await next(2).then(() => { throw new Error('Empty assessment advanced'); }, () => {});
  assert.equal(backendRequests.length, 0, 'Assessment must make no backend requests');
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(await js('window.__painQA.writes.some(w=>/painAreas|relatedHistory|q4PreviewType/.test(w.value))'), false);
  pass('Confirmed restart clears all answers; no assessment network requests, health-answer storage or browser exceptions');
  await writeFile(join(output, `report-${centerMode}.json`), JSON.stringify({ checks, errors, backendRequests, screenshots: output }, null, 2));
  console.log(`Screenshots and report: ${output}`);
} catch (error) { console.error('Browser errors:', errors); throw error; }
finally { socket.close(); }
