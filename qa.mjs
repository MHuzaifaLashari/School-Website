import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve(import.meta.dirname);
const errors = [];
const results = [];
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = resolve(root, `.${url.pathname === '/' ? '/index.html' : url.pathname}`);
  if (!path.startsWith(root + '\\')) { res.writeHead(403).end(); return; }
  try { const content = await readFile(path); res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' })[extname(path)] || 'application/octet-stream' }); res.end(content); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(4173, '127.0.0.1', r));
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9223', `--user-data-dir=${resolve(root, '.qa-browser')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws;
let failed = false;
try {
  let target;
  for (let i = 0; i < 50; i++) { try { const targets = await fetch('http://127.0.0.1:9223/json').then(r => r.json()); target = targets.find(t => t.type === 'page'); if (target) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  if (!target) throw new Error('Browser did not start.');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let sequence = 0;
  const pending = new Map();
  ws.onmessage = event => { const data = JSON.parse(event.data); if (data.id) { const p = pending.get(data.id); pending.delete(data.id); data.error ? p.reject(data.error) : p.resolve(data.result); } else if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text + ': ' + (data.params.exceptionDetails.exception?.description || '')); };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text); return response.result.value; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const check = (name, passed) => { results.push({ name, passed: Boolean(passed) }); if (!passed) failed = true; };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'try { localStorage.clear(); } catch {}' });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' }); await wait(1600);
  check('Home renders eight course cards', await evaluate(`document.querySelectorAll('#home-courses .course-card').length === 8`));
  check('No horizontal overflow on desktop', await evaluate(`document.documentElement.scrollWidth <= innerWidth`));
  await evaluate(`document.querySelector('[data-category="Programming"]').click()`);
  check('Home category filters courses', await evaluate(`document.querySelectorAll('#home-courses .course-card').length === 2`));
  await evaluate(`document.querySelector('.save-course').click()`);
  check('Saving a course updates local storage', await evaluate(`JSON.parse(localStorage.getItem('ecoach-saved')).length === 1`));
  const routes = ['courses', 'course/web-development', 'about', 'instructors', 'instructor/0', 'instructor/1', 'shop', 'product/learning-journal', 'cart', 'blog', 'article/leadership', 'contact', 'contact/instructor', 'faq', 'learning', 'learn/python', 'privacy', 'terms'];
  for (const route of routes) { await evaluate(`location.hash = ${JSON.stringify(route)}`); await wait(70); check(`Route ${route} renders`, await evaluate(`!!document.querySelector('main h1') && !document.querySelector('main').textContent.includes('That page isn’t here.')`)); }
  await evaluate(`location.hash = 'courses'`); await wait(80);
  await evaluate(`document.getElementById('course-search').value = 'python';document.getElementById('course-search').dispatchEvent(new Event('input',{bubbles:true}))`);
  check('Catalog keyword search', await evaluate(`document.querySelectorAll('#catalog-courses .course-card').length === 2`));
  await evaluate(`document.getElementById('course-search').value = 'zzzzzz';document.getElementById('course-search').dispatchEvent(new Event('input',{bubbles:true}))`);
  check('Empty search state', await evaluate(`!!document.querySelector('#catalog-courses .empty-state')`));
  await evaluate(`document.querySelector('[data-action="reset-filters"]').click()`);
  check('Reset filters restores nine courses', await evaluate(`document.querySelectorAll('#catalog-courses .course-card').length === 9`));
  await evaluate(`location.hash = 'course/web-development'`); await wait(70);
  for (const tab of ['Curriculum', 'Instructor', 'Reviews', 'Overview']) { await evaluate(`document.querySelector('[data-detail-tab="${tab}"]').click()`); check(`Course ${tab} tab opens`, await evaluate(`document.querySelector('[data-detail-tab="${tab}"]').getAttribute('aria-selected') === 'true' && document.querySelector('#detail-panel').textContent.length > 50`)); }
  await evaluate(`document.querySelector('[data-add]').click()`);
  check('Cart adds a course', await evaluate(`JSON.parse(localStorage.getItem('ecoach-cart')).includes('web-development')`));
  await evaluate(`location.hash = 'cart'`); await wait(70);
  await evaluate(`document.querySelector('[data-action="checkout"]').click()`);
  check('Checkout opens dialog', await evaluate(`document.querySelector('#modal').open && !!document.querySelector('#checkout-form')`));
  await evaluate(`document.querySelector('#checkout-form [name="name"]').value='QA Learner';document.querySelector('#checkout-form [name="email"]').value='qa@example.com';document.querySelector('#checkout-form').requestSubmit()`);
  check('Checkout enrolls the selected course and clears cart', await evaluate(`JSON.parse(localStorage.getItem('ecoach-enrolled')).includes('web-development') && JSON.parse(localStorage.getItem('ecoach-cart')).length === 0`));
  await evaluate(`location.hash = 'learn/web-development'`); await wait(70);
  await evaluate(`document.querySelector('#lesson-note').value='My test learning goal';document.querySelector('[data-complete]').click()`);
  check('Lesson progress and reflection persist', await evaluate(`JSON.parse(localStorage.getItem('ecoach-progress'))['web-development'] && JSON.parse(localStorage.getItem('ecoach-note-web-development')) === 'My test learning goal'`));
  await evaluate(`document.querySelector('.login-trigger').click()`);
  await evaluate(`document.querySelector('#auth-form [name="name"]').value='QA Learner';document.querySelector('#auth-form [name="email"]').value='qa@example.com';document.querySelector('#auth-form').requestSubmit()`);
  check('Demo profile opens without storing a password', await evaluate(`JSON.parse(localStorage.getItem('ecoach-profile')).name === 'QA Learner' && !localStorage.getItem('ecoach-profile').includes('password')`));
  await evaluate(`location.hash='contact'`); await wait(70);
  await evaluate(`const cf=document.querySelector('#contact-form');cf.elements.name.value='QA Learner';cf.elements.email.value='qa@example.com';cf.elements.message.value='I have a question about courses.';cf.requestSubmit()`);
  check('Contact form confirms demo submission', await evaluate(`document.querySelector('#contact-message').textContent.includes('No message was sent')`));
  await evaluate(`location.hash='home'`); await wait(100);
  await evaluate(`document.querySelector('[data-quote="1"]').click()`);
  check('Story slider moves to next story', await evaluate(`document.querySelector('#quote-card').textContent.includes('One step at a time')`));
  await mkdir(resolve(root, 'screenshots'), { recursive: true });
  await evaluate(`profile=null;updateProfile();document.querySelector('.toast').classList.remove('visible')`);
  check('All local reference assets load', await evaluate(`(async()=>{const local=[...document.images].filter(im=>im.src.includes('/assets/'));local.forEach(im=>im.loading='eager');await Promise.all(local.map(im=>im.decode().catch(()=>{})));return local.every(im=>im.naturalWidth>0)})()`));
  await wait(350);
  let shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(resolve(root, 'screenshots/desktop.png'), Buffer.from(shot.data, 'base64'));
  const layout = await send('Page.getLayoutMetrics');
  shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: layout.cssContentSize.width, height: layout.cssContentSize.height, scale: 1 } }); await writeFile(resolve(root, 'screenshots/full-page.png'), Buffer.from(shot.data, 'base64'));
  for (const width of [320, 375, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 650 });
    for (const route of ['home', 'courses', 'course/web-development', 'contact', 'shop', 'instructors', 'learning']) { await evaluate(`location.hash=${JSON.stringify(route)}`); await wait(50); check(`No overflow: ${route} at ${width}px`, await evaluate(`document.documentElement.scrollWidth <= innerWidth`)); }
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: true });
  await evaluate(`location.hash='home'`); await wait(150);
  await evaluate(`document.querySelector('.mobile-toggle').click()`);
  check('Mobile navigation opens', await evaluate(`document.querySelector('.mobile-nav').classList.contains('open') && document.querySelector('.mobile-toggle').getAttribute('aria-expanded')==='true'`));
  await evaluate(`document.querySelector('.mobile-toggle').click()`);
  shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(resolve(root, 'screenshots/mobile.png'), Buffer.from(shot.data, 'base64'));
  check('No uncaught JavaScript exceptions', errors.length === 0);
  const report = { passed: results.filter(r => r.passed).length, total: results.length, errors, results };
  await writeFile(resolve(root, 'qa-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) { failed = true; console.error(error); }
finally { if (ws) ws.close(); browser.kill(); server.close(); }
process.exit(failed ? 1 : 0);
