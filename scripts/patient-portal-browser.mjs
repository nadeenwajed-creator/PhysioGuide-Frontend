// Local CDP verification, using only existing shared mock services and an isolated
// browser profile. Screenshots/test reports go to OS temp, not product assets.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const origin = 'http://127.0.0.1:5175', output = join(tmpdir(), 'physioguide-patient-portal-qa');
await mkdir(output, { recursive: true });
const pages = await fetch('http://127.0.0.1:9223/json').then(r => r.json());
const target = pages.find(p => p.type === 'page' && !p.url.startsWith('edge:'));
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
const waiting = new Map(), events = new Map(), errors = [], checks = [], failures = [];
let sequence = 0;
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const handler = waiting.get(message.id); waiting.delete(message.id);
    if (message.error) handler?.reject(new Error(JSON.stringify(message.error))); else handler?.resolve(message.result);
  } else for (const handler of events.get(message.method) || []) handler(message.params);
});
function call(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; waiting.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }
async function js(expression) {
  const response = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result?.value;
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
if (process.argv.includes('--inspect')) {
  console.log(await js(`({url:location.href,body:document.body.innerText.slice(-2000),selects:[...document.querySelectorAll('select')].map(e=>({value:e.value,options:[...e.options].map(o=>o.value)}))})`));
  socket.close(); process.exit(0);
}
async function until(expression, label, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await js(expression)) return; await pause(100); }
  throw new Error(`Timeout ${label}: ${await js('document.body.innerText.slice(-1200)')}`);
}
async function click(selector) {
  const coordinates = await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)throw new Error('Missing enabled '+${JSON.stringify(selector)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...coordinates, button: 'left', clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...coordinates, button: 'left', clickCount: 1 });
  await pause(100);
}
async function input(selector, value) {
  await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const setter=Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);
  await pause(100);
}
async function swipe(selector) {
  const r = await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center',behavior:'instant'});return e.getBoundingClientRect().toJSON()})()`);
  const y = Math.max(90, Math.min(700, r.y + r.height / 2));
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + r.width * .8, y }] });
  for (const fraction of [.65, .5, .35, .2]) { await call('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: r.x + r.width * fraction, y }] }); await pause(25); }
  await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pause(150);
}
async function route(path, selector) {
  await js(`history.pushState(null,'',${JSON.stringify('/patient/' + path)});window.dispatchEvent(new PopStateEvent('popstate'))`);
  await until(`Boolean(document.querySelector(${JSON.stringify(selector)}))`, path);
}
async function viewport(width, height = 900) { await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); await pause(120); }
async function screenshot(name) {
  await js('window.scrollTo({top:0,left:0,behavior:"instant"})');
  const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
}
function pass(label) { checks.push(label); console.log('PASS', label); }
async function bounds(label) {
  const result = await js(`({width:innerWidth,scroll:document.documentElement.scrollWidth,bad:[...document.querySelectorAll('main .pd-page *,main .pa-page *,main .pain-page *')].filter(e=>['BUTTON','INPUT','SELECT','IMG'].includes(e.tagName)&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('.pd-tabs[role="tablist"]')).map(e=>({tag:e.tagName,cls:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(r=>r.width>2&&(r.left < -2||r.right>innerWidth+2))})`);
  if (result.scroll > result.width + 1 || result.bad.length) { failures.push({ label, ...result }); console.log('FAIL bounds', label, JSON.stringify(result)); await screenshot(`failure-${failures.length}`); }
}
async function languageTheme(language, theme) {
  await viewport(1366);
  if (await js('document.documentElement.lang') !== language) { await click('.pg-language-switcher__toggle'); await click(`.pg-language-switcher__option:has([lang="${language}"])`); }
  if (await js('document.documentElement.dataset.theme') !== theme) await click('.pg-theme-toggle');
  await until(`document.documentElement.lang===${JSON.stringify(language)}&&document.documentElement.dataset.theme===${JSON.stringify(theme)}`, 'language/theme');
}

try {
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await call('Network.setCacheDisabled', { cacheDisabled: true });
  events.set('Runtime.exceptionThrown', [({ exceptionDetails }) => errors.push(exceptionDetails.exception?.description || exceptionDetails.text)]);
  await viewport(1366);
  await call('Page.navigate', { url: origin + '/patient/login' });
  await until('Boolean(document.querySelector("#root")?.children.length)', 'app');
  await js(`(async()=>{const auth=await import('/src/services/authService.js');const {MOCK_PASSWORD}=await import('/src/services/auth/mockAccounts.js');const repository=await import('/src/services/mock/centerRepository.js');const {createCenterPortalData}=await import('/src/data/centerPortal.js');repository.centerStore.write(createCenterPortalData());await auth.loginPatient({email:'patient@example.com',password:MOCK_PASSWORD});localStorage.setItem('physioguide-language','en');sessionStorage.setItem('physioguide-theme','light')})()`);
  await call('Page.navigate', { url: origin + '/patient/dashboard' });
  await until('Boolean(document.querySelector(".pd-card"))', 'dashboard discovery');
  await js(`(async()=>{const {getPatientDiscovery}=await import('/src/services/patientDiscoveryService.js');const auth=await import('/src/services/authService.js');const data=await getPatientDiscovery(auth.getAuthSnapshot().session);window.__portalQA={center:data.centers[0],therapist:data.centers[0].therapists[0]};})()`);
  const centerId = await js('window.__portalQA.center.id'), therapistId = await js('window.__portalQA.therapist.id');
  const centerPath = `centers/${encodeURIComponent(centerId)}`, therapistPath = `${centerPath}/therapists/${encodeURIComponent(therapistId)}`;
  assert.match(await js('document.querySelector(".pd-hero img").src'), /dashboard-rehabilitation-hero/);
  await screenshot('REF-01-dashboard-1366');
  pass('Dashboard uses supplied hero photograph and shared live discovery cards');

  if (process.argv.includes('--explore-only')) {
    await route('pain-assessment', '.pain-step-1');
    await click('.pain-choice:has(input[value="knee"])');
    await click('.pain-navigation button[type=submit]');
    await until('Boolean(document.querySelector(".pain-step-2"))', 'intensity question');
    await input('#pain-intensity', '5');
    await click('.pain-navigation button[type=submit]');
    await click('.pain-choice:has(input[value="weeks_1_4"])');
    await click('.pain-navigation button[type=submit]');
    await click('.pain-choice:has(input[value="aching"])');
    await click('.pain-navigation button[type=submit]');
    await click('.pain-choice:has(input[value="none"])');
    await click('.pain-navigation button[type=submit]');
    await until('Boolean(document.querySelector(".pain-center-link"))', 'shared mock knee center');
    await click('.pd-matching-link');
    await until('Boolean(document.querySelector(".pd-filter-controls"))', 'Find Centers from assessment');
    assert.equal(await js('new URLSearchParams(location.search).get("specialty")'), 'care:knee');
    assert.equal(await js('document.querySelector(".pd-filter-controls select").value'), 'care:knee');
    await until('Boolean(document.querySelector(".pd-card"))', 'matching Find Centers card');
    await click('.pd-card-actions button:first-child');
    await until('Boolean(document.querySelector(".pd-single-gallery"))', 'View Center');
    assert.equal(await js('location.pathname'), `/patient/${centerPath}`);
    pass('Five-step local care leads to shared matching centers, specialty-filtered discovery and correct View Center navigation');
  } else if (process.argv.includes('--availability-only')) {
    await js(`(async()=>{const r=await import('/src/services/mock/centerRepository.js'),{createMockCenterAdapter}=await import('/src/services/center/mockCenterAdapter.js');const w=r.readMockCenter(${JSON.stringify(centerId)}),p=w.therapists.find(p=>p.id===${JSON.stringify(therapistId)});const adapter=createMockCenterAdapter(w,{store:r.getCenterStore(w.center.id)});await adapter.saveTherapist({role:'center',centerId:w.center.id},{specialty:p.specialty.en,specialtyAr:p.specialty.ar,experience:String(p.experience),availability:p.availability,serviceIds:[w.services[0].id,w.services[1].id]},p.id);window.dispatchEvent(new StorageEvent('storage',{key:r.centerStore.key}));})()`);
    await route(therapistPath, '.pd-time-rail');
    const future = await js(`(()=>{const d=new Date();d.setDate(d.getDate()+10);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})()`);
    await input('.pd-calendar-button input', future);
    await until('Boolean(document.querySelector(".pd-time-marker:not(:disabled)"))', 'available first service');
    await click('.pd-time-marker:not(:disabled)');
    await click('.pd-appointments .pd-chips button:nth-child(2)');
    assert.equal(await js('document.querySelectorAll(".pd-time-marker.is-selected").length'), 0);
    await until('Boolean(document.querySelector(".pd-time-marker:not(:disabled)"))', 'second service availability');
    await click('.pd-time-marker:not(:disabled)');
    const chosenTime = await js('document.querySelector(".pd-time-marker.is-selected bdi").textContent');
    await js(`(async()=>{const r=await import('/src/services/mock/centerRepository.js'),{createMockCenterAdapter}=await import('/src/services/center/mockCenterAdapter.js');const w=r.readMockCenter(${JSON.stringify(centerId)}),adapter=createMockCenterAdapter(w,{store:r.getCenterStore(w.center.id)});await adapter.saveAppointment({role:'center',centerId:w.center.id},{patientId:w.patients.find(p=>p.id!=='patient-1').id,therapistId:${JSON.stringify(therapistId)},serviceId:w.services[1].id,date:${JSON.stringify(future)},time:${JSON.stringify(chosenTime)},note:''});window.dispatchEvent(new StorageEvent('storage',{key:r.centerStore.key}));})()`);
    await until('document.querySelectorAll(".pd-time-marker.is-selected").length===0', 'peer booking invalidates selection');
    await until(`Boolean(document.querySelector('.pd-time-marker[aria-label^="${chosenTime}"]:disabled'))`, 'occupied slot disabled');
    await click('.pd-book-actions button:first-child');
    await until('Boolean(document.querySelector("#patient-booking"))', 'booking with invalidated time');
    assert.equal(await js('document.querySelector(".pg-modal__footer button[type=submit]").disabled'), true);
    await click('.pg-modal__close');
    pass('Changing services and peer Center bookings refresh the rail, clear stale selection and prevent invalid booking');
  } else if (!process.argv.includes('--matrix-only')) {
    await route('centers', '.pd-card'); await viewport(375);
    assert.equal(await js('getComputedStyle(document.querySelector(".pd-filter-controls")).display'), 'none');
    await click('.pd-filter-toggle');
    await input('.pd-filter-controls select:first-child', 'care:knee');
    await click('.pd-filter-toggle');
    assert.equal(await js('new URLSearchParams(location.search).get("specialty")'), 'care:knee');
    assert.equal(await js('document.querySelectorAll(".pd-card").length'), 1);
    if (await js('document.querySelector(".pd-favorite").getAttribute("aria-pressed")') === 'true') { await click('.pd-card .pd-favorite'); await until('document.querySelector(".pd-favorite").getAttribute("aria-pressed")==="false"', 'remove favorite'); }
    await click('.pd-card .pd-favorite');
    await until('document.querySelector(".pd-favorite").getAttribute("aria-pressed")==="true"', 'favorite');
    await click('.pd-tabs button:nth-child(2)');
    assert.equal(await js('document.querySelectorAll(".pd-card").length'), 1);
    pass('Collapsed filters preserve category; favorites update Saved Centers');

    await viewport(1366);
    await route(centerPath, '.pd-single-gallery');
    const photo = await js('document.querySelector(".pd-gallery-main img").src');
    await click('.pd-gallery-next');
    assert.notEqual(await js('document.querySelector(".pd-gallery-main img").src'), photo);
    await js('document.querySelector(".pd-gallery-main").focus()');
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'End', code: 'End' });
    assert.equal(await js('document.querySelector(".pd-gallery-counter").textContent.trim()'), '4 / 4');
    await swipe('.pd-gallery-main');
    assert.equal(await js('document.querySelectorAll("dialog[open]").length'), 0, 'Swiping must not open image modal');
    assert.equal(await js('document.querySelector(".pd-gallery-counter").textContent.trim()'), '1 / 4');
    await click('#center-tab-reviews');
    await until('document.querySelectorAll(".pd-review-card").length===3', 'three desktop reviews');
    const author = await js('document.querySelector(".pd-review-card h3").textContent');
    await click('.pd-carousel-controls button:last-child');
    assert.notEqual(await js('document.querySelector(".pd-review-card h3").textContent'), author);
    await screenshot('REF-04-reviews-1366');
    pass('Gallery includes all images and keyboard End; carousel exposes reviews beyond first three');

    // Exercise edge cardinalities with existing records in isolated browser storage.
    for (const count of [0, 1, 2, 3, 5]) {
      await js(`(async()=>{const r=await import('/src/services/mock/centerRepository.js');const w=r.readMockCenter(${JSON.stringify(centerId)});w.reviews=window.__portalQA.center.reviews.slice(0,${count}).map(v=>({...v,patientId:'patient-1'}));r.getCenterStore(${JSON.stringify(centerId)}).write(w);window.dispatchEvent(new StorageEvent('storage',{key:r.centerStore.key}));})()`);
      await until(`document.querySelectorAll('.pd-review-card').length===${Math.min(count, 3)}`, `review count ${count}`);
    }
    await js(`(async()=>{const r=await import('/src/services/mock/centerRepository.js');const w=r.readMockCenter(${JSON.stringify(centerId)});w.reviews[0].text='Long review '.repeat(40);w.reviews[0].reply='QA response preserved with this review';w.patients.find(p=>p.id==='patient-1').imageUrl='';r.getCenterStore(${JSON.stringify(centerId)}).write(w);window.dispatchEvent(new StorageEvent('storage',{key:r.centerStore.key}));})()`);
    await js('document.querySelector(".pd-review-window").focus()');
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Home', code: 'Home' });
    await until('Boolean(document.querySelector(".pd-review-card button"))', 'full review action');
    await click('.pd-review-card button');
    assert.match(await js('document.querySelector("dialog").innerText'), /Center Response/);
    await click('.pg-modal__close');
    pass('Reviews handle 0/1/2/3/5 records, initials fallback and complete long text/response details');
    await viewport(375);
    await until('document.querySelectorAll(".pd-review-card").length===1', 'one mobile review');
    const reviewText = await js('document.querySelector(".pd-review-preview").textContent');
    await swipe('.pd-review-window');
    assert.notEqual(await js('document.querySelector(".pd-review-preview").textContent'), reviewText);
    await viewport(1366);

    await route(therapistPath, '.pd-time-rail');
    const future = await js(`(()=>{const d=new Date();d.setDate(d.getDate()+7);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})()`);
    await input('.pd-calendar-button input', future);
    await until('Boolean(document.querySelector(".pd-time-marker:not(:disabled)"))', 'available time');
    await click('.pd-time-marker:not(:disabled)');
    const selectedTime = await js('document.querySelector(".pd-time-marker.is-selected bdi").textContent');
    await screenshot('REF-05-therapist-1366');
    await click('.pd-book-actions button:first-child');
    await until('Boolean(document.querySelector("#patient-booking"))', 'booking modal');
    await until('!document.querySelector(".pg-modal__footer button[type=submit]").disabled', 'booking revalidated');
    assert.equal(await js('document.querySelector("#patient-booking input[type=date]").value'), future);
    assert.equal(await js('[...document.querySelectorAll("#patient-booking select")].at(-1).value'), selectedTime);
    await click('.pg-modal__footer button[type=submit]');
    await until('Boolean(document.querySelector(".pa-appointment"))', 'appointments after booking');
    assert.match(await js('document.querySelector(".pa-appointments").innerText'), /Pending/);
    await click('.pa-appointment-detail');
    await until('Boolean(document.querySelector("dialog[open]"))', 'appointment details');
    await click('.pg-modal__close');
    pass('Calendar/strip synchronize, valid rail selection reaches booking, created pending appointment and details work');

    await route('profile', '.pa-profile');
    await click('.pa-profile-edit');
    await input('#patient-name', 'Patient QA Updated');
    await input('#patient-city', 'Ramallah');
    const documentRoot = await call('DOM.getDocument');
    const upload = await call('DOM.querySelector', { nodeId: documentRoot.root.nodeId, selector: '#patient-imageUrl' });
    await call('DOM.setFileInputFiles', { nodeId: upload.nodeId, files: ['C:/Users/PC/Desktop/PhysioGuide/src/assets/images/center/portrait-01.webp'] });
    await until('[...document.querySelectorAll(".pa-photo-editor img")].some(image=>image.src.startsWith("data:image/webp"))', 'valid photo upload');
    await click('.pg-modal__footer button[type=submit]');
    await until('!document.querySelector("dialog[open]")&&document.querySelector(".pa-profile").innerText.includes("Patient QA Updated")', 'profile save');
    await until('document.querySelector(".pg-navbar").innerText.includes("Patient QA Updated")', 'navbar profile sync');
    await until('[...document.querySelectorAll(".pg-navbar img")].some(image=>image.src.startsWith("data:image/webp"))', 'navbar photo sync');
    await route('settings', '.pa-settings');
    assert.match(await js('document.querySelector(".pa-settings").innerText'), /Patient QA Updated/);
    await click('#settings-notifications');
    await until('document.querySelectorAll(".pa-preference input").length===3', 'notification settings');
    if (await js('document.querySelector(".pa-preference:nth-child(3) input").checked')) await click('.pa-preference:nth-child(3) input');
    await click('.pa-form-actions button[type=submit]');
    await until(`(async()=>{const a=await import('/src/services/authService.js'),s=await import('/src/services/patientAccountService.js');return !(await s.getPatientAccount(a.getAuthSnapshot().session)).preferences.newMessages})()`, 'disabled message preference persisted');
    await js(`(async()=>{const a=await import('/src/services/authService.js'),m=await import('/src/services/messageService.js'),r=await import('/src/services/mock/centerRepository.js'),{createMockCenterAdapter}=await import('/src/services/center/mockCenterAdapter.js');const actor=a.getAuthSnapshot().session;const before=await m.getMessagingWorkspace(actor),c=before.conversations[0];const adapter=createMockCenterAdapter(r.readMockCenter(${JSON.stringify(centerId)}),{store:r.getCenterStore(${JSON.stringify(centerId)})});const sent=await adapter.sendMessage({role:'physiotherapist',centerId:${JSON.stringify(centerId)},therapistId:c.therapistId},c.id,{text:'QA muted browser delivery',clientId:crypto.randomUUID()});const after=await m.getMessagingWorkspace(actor);if(after.notifications.some(n=>n.id.endsWith(sent.id))||after.conversations.find(v=>v.id===c.id).unreadCount!==before.conversations.find(v=>v.id===c.id).unreadCount+1)throw new Error('Notification suppression mismatch');window.dispatchEvent(new StorageEvent('storage',{key:r.centerStore.key}));})()`);
    await click('#settings-security');
    await click('.pa-security-form button[type=submit]');
    assert.equal(await js('document.querySelectorAll(".pa-security-form input[aria-invalid=true]").length'), 3);
    await input('#patient-security-currentPassword', 'test-only-current');
    await input('#patient-security-newPassword', 'test-only-new-123');
    await input('#patient-security-confirmPassword', 'different-test-only');
    await click('.pa-security-form button[type=submit]');
    assert.equal(await js('document.querySelector("#patient-security-confirmPassword").getAttribute("aria-invalid")'), 'true');
    await input('#patient-security-confirmPassword', 'test-only-new-123');
    await click('.pa-security-form button[type=submit]');
    await until('Boolean(document.querySelector(".pa-security-form .center-feedback--error"))', 'honest unsupported password action');
    assert.equal(await js('Object.values(localStorage).some(v=>v.includes("test-only-new-123"))'), false);
    pass('Profile changes synchronize with Settings/Navbar; notification controls persist and suppress recipient alerts; password validation is honest and stores no credentials');
  }

  let cases = [
    ['dashboard', 'dashboard', '.pd-hero'], ['centers', 'centers', '.pd-card'],
    ['center-services', centerPath + '?tab=services', '.pd-service-card'],
    ['center-reviews', centerPath + '?tab=reviews', '.pd-reviews-carousel'],
    ['center-overview', centerPath + '?tab=overview', '.pd-hours'],
    ['center-therapists', centerPath + '?tab=therapists', '.pd-therapist-card'],
    ['therapist', therapistPath, '.pd-time-rail'], ['appointments', 'appointments', '.pa-appointment'],
    ['profile', 'profile', '.pa-profile'], ['settings', 'settings', '.pa-settings'],
  ];
  const selectedPages = process.argv.find(arg => arg.startsWith('--pages='))?.slice(8).split(',');
  if (selectedPages) cases = cases.filter(([key]) => selectedPages.includes(key));
  if (!process.argv.includes('--interactions-only') && !process.argv.includes('--explore-only') && !process.argv.includes('--availability-only')) {
  for (const [language, theme] of [['en', 'light'], ['ar', 'dark']]) {
    await languageTheme(language, theme);
    for (const width of [320, 375, 425, 768, 1024, 1366, 1440]) {
      await viewport(width);
      for (const [label, path, selector] of cases) {
        await route(path, selector); await pause(200);
        await bounds(`${label} ${width} ${language}/${theme}`);
        if (label === 'therapist') {
          const contained = await js(`(()=>{const rail=document.querySelector('.pd-time-rail').getBoundingClientRect(),parent=document.querySelector('.pd-appointments').getBoundingClientRect();return rail.left>=parent.left&&rail.right<=parent.right})()`);
          if (!contained) failures.push({ label:`rail containment ${width} ${language}` });
        }
        if ([375, 1366].includes(width)) await screenshot(`${label}-${width}-${language}-${theme}`);
      }
      console.log(`CHECKED ${width}px ${language}/${theme}`);
    }
  }
  // Additional theme/direction combinations at the main desktop size.
  for (const [language, theme] of [['en', 'dark'], ['ar', 'light']]) {
    await languageTheme(language, theme);
    for (const [label, path, selector] of cases) { await route(path, selector); await bounds(`${label} 1366 ${language}/${theme}`); }
  }
  }
  await writeFile(join(output, 'report.json'), JSON.stringify({ checks, failures, errors, output }, null, 2));
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(failures.length, 0, JSON.stringify(failures, null, 2));
  if (!process.argv.includes('--interactions-only') && !process.argv.includes('--explore-only') && !process.argv.includes('--availability-only')) pass('Responsive matrix passed for selected Patient views, with RTL and both themes');
  await writeFile(join(output, 'report.json'), JSON.stringify({ checks, failures, errors, output }, null, 2));
  await writeFile(join(output, process.argv.includes('--availability-only') ? 'report-availability.json' : process.argv.includes('--explore-only') ? 'report-explore.json' : process.argv.includes('--interactions-only') ? 'report-interactions.json' : selectedPages ? 'report-additional-layouts.json' : 'report-matrix.json'), JSON.stringify({ checks, failures, errors, output }, null, 2));
  console.log('Screenshots and report:', output);
} catch (error) { console.error('Browser exceptions:', errors); await writeFile(join(output, 'failure.json'), JSON.stringify({ message: error.message, failures, errors }, null, 2)); throw error; }
finally { socket.close(); }
