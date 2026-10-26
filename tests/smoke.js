// Headless-Chrome smoke test for Breakout BD (puppeteer-core + system Chromium).
// Run from project root: npm install --no-save --no-package-lock puppeteer-core && node tests/smoke.js
'use strict';
const puppeteer = require('puppeteer-core');
const FILE = 'file:///home/hatch/workspace/muse-project-factory/builds/breakout-bd/index.html';
let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  ok:', label); }
  else { fail++; console.error('FAIL:', label); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/opt/meta-chromium/chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files']
  });
  const errors = [], net = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('request', r => { const u = r.url(); if (!u.startsWith('file://') && !u.startsWith('data:') && !u.startsWith('blob:')) net.push(u); });
    await page.goto(FILE, { waitUntil: 'load' });
    await sleep(500);
    ok(await page.title() === 'Breakout BD — Brick Breaker Game', 'page title');
    const h1 = await page.$eval('h1', el => el.textContent);
    ok(h1 === 'Breakout BD', 'h1 renders');
    ok(await page.$eval('#game-canvas', el => el.width === 480 && el.height === 600), 'canvas 480x600');
    let st = await page.evaluate(() => window.__breakout.getState());
    ok(st.phase === 'ready' && st.score === 0 && st.lives === 3 && st.level === 1 && st.bricksLeft === 40, 'initial state ready/0/3/1/40 bricks');
    ok(await page.$eval('#overlay', el => !el.classList.contains('hidden')), 'ready overlay visible');
    await page.click('#btn-start');
    await sleep(300);
    st = await page.evaluate(() => window.__breakout.getState());
    ok(st.phase === 'playing' && st.served === true, 'start serves ball, phase playing');
    const x0 = st.paddleX;
    await page.keyboard.down('ArrowRight');
    await sleep(400);
    await page.keyboard.up('ArrowRight');
    st = await page.evaluate(() => window.__breakout.getState());
    ok(st.paddleX > x0, 'ArrowRight moves paddle right (' + x0 + ' -> ' + st.paddleX + ')');
    await page.click('#btn-pause');
    await sleep(200);
    st = await page.evaluate(() => window.__breakout.getState());
    ok(st.phase === 'paused', 'pause button pauses');
    await page.click('#btn-pause');
    await sleep(200);
    st = await page.evaluate(() => window.__breakout.getState());
    ok(st.phase === 'playing', 'pause button resumes');
    await page.click('#btn-lang');
    await sleep(200);
    const h1bn = await page.$eval('h1', el => el.textContent);
    ok(h1bn === 'ব্রেকআউট বিডি', 'language toggle switches title to Bengali');
    await page.click('#btn-lang');
    await sleep(200);
    ok(await page.$eval('h1', el => el.textContent) === 'Breakout BD', 'language toggle switches back');
    await page.click('#btn-restart');
    await sleep(300);
    st = await page.evaluate(() => window.__breakout.getState());
    ok(st.phase === 'ready' && st.score === 0 && st.lives === 3 && st.level === 1, 'restart resets state');
    ok(errors.length === 0, 'zero console/page errors' + (errors.length ? ' (' + errors.join('; ') + ')' : ''));
    ok(net.length === 0, 'zero network requests' + (net.length ? ' (' + net.join(', ') + ')' : ''));
    // Mobile viewport: no horizontal overflow.
    await page.setViewport({ width: 390, height: 844 });
    await sleep(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    ok(!overflow, '390px viewport: no horizontal overflow');
  } finally {
    await browser.close();
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('SMOKE CRASH:', e); process.exit(1); });
