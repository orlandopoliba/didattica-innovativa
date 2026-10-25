/* Optional UI checks. Requires Playwright and a Chromium installation. */
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || process.argv[2] || 'playwright');
const root = path.resolve(__dirname, '..');
let localURL;
const errors = [];
const wait = page => page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
const count = async page => Number((await page.locator('#repetition-count').innerText()).replace(/\./g, '').split(' ')[0]);
const fillN = async (page, n) => {
  await page.locator('#sample-size').evaluate((input, value) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, n);
  await wait(page);
};
const center = async locator => {
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

async function checkLayout(page) {
  const result = await page.evaluate(() => {
    const panels = [...document.querySelectorAll('.panel')].map(el => {
      const r = el.getBoundingClientRect();
      const title = el.querySelector('h2').getBoundingClientRect();
      return { width: r.width, height: r.height, x: r.x, y: r.y, titleOffset: title.x + title.width / 2 - (r.x + r.width / 2) };
    });
    const overflows = [...document.querySelectorAll('.panel')].filter(panel => {
      const p = panel.getBoundingClientRect();
      return [...panel.children].some(child => {
        const c = child.getBoundingClientRect();
        return c.right > p.right + 1 || c.bottom > p.bottom + 1;
      });
    }).map(p => p.className);
    return { panels, overflows, width: innerWidth, height: innerHeight, bodyWidth: document.documentElement.scrollWidth, bodyHeight: document.documentElement.scrollHeight };
  });
  assert.ok(result.bodyWidth <= result.width, 'No horizontal page overflow');
  assert.deepEqual(result.overflows, [], 'Panel contents stay inside their quadrant');
  for (const panel of result.panels) assert.ok(Math.abs(panel.titleOffset) < 1, 'Quadrant subtitles are centered');
  assert.equal(await page.locator('.katex-error').count(), 0);
  if (result.width > 760) {
    if (result.height >= 706) assert.ok(result.bodyHeight <= result.height + 1, 'Slide fits the desktop viewport');
    for (const panel of result.panels) {
      assert.ok(Math.abs(panel.width - result.panels[0].width) <= 1);
      assert.ok(Math.abs(panel.height - result.panels[0].height) <= 1);
    }
  } else {
    for (let i = 1; i < result.panels.length; i++) assert.ok(result.panels[i].y > result.panels[i - 1].y);
  }
}

async function desktopChecks(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(localURL + '#/1');
  await page.waitForFunction(() => window.Reveal?.isReady() && document.querySelectorAll('.sample-cell').length === 50);
  await wait(page);
  assert.equal(await page.locator('.sample-cell').count(), 50);
  assert.equal(await page.locator('#sample-mean').getAttribute('data-value'), '—');
  await checkLayout(page);
  assert.match(await page.locator('#population-mean').getAttribute('data-latex'), /\\mathbb\{E\}/);
  assert.equal(await page.locator('#population-mean .katex').count(), 1);
  await page.locator('#sample-button').click();
  await wait(page);
  assert.equal(await count(page), 1, 'Click adds one mean, not two');
  assert.equal(await page.locator('.sample-cell.is-filled').count(), 1);
  assert.equal(await page.locator('.sample-dot').count(), 1);
  assert.match(await page.locator('.sample-cell.is-filled').first().textContent(), /^-?\d+\.\d{2}$/);
  assert.match(await page.locator('#sample-mean').getAttribute('data-value'), /^-?\d+\.\d{3}$/);
  await fillN(page, 50);
  assert.equal(await count(page), 0);
  assert.equal(await page.locator('#sample-mean').getAttribute('data-value'), '—');
  await page.locator('#sample-button').click();
  await wait(page);
  assert.equal(await page.locator('.sample-cell.is-filled').count(), 50);
  assert.equal(await page.locator('.sample-dot').count(), 50);
  const button = await center(page.locator('#sample-button'));
  await page.mouse.move(button.x, button.y);
  await page.mouse.down();
  await page.waitForTimeout(850);
  await page.mouse.move(button.x + 160, button.y + 70);
  await page.mouse.up();
  await wait(page);
  const afterHold = await count(page);
  assert.ok(afterHold >= 20 && afterHold <= 35, `Hold generates about 50 samples per second: ${afterHold}`);
  await page.waitForTimeout(250);
  assert.equal(await count(page), afterHold, 'Release outside button stops sampling');
  await page.locator('#theory-button').click();
  await wait(page);
  assert.equal(await page.locator('.theory-line').getAttribute('hidden'), null);
  const originalCounts = await page.locator('.histogram-bar').evaluateAll(bars => bars.map(b => Number(b.dataset.count)));
  await page.locator('#view-means').click();
  await wait(page);
  assert.equal(await count(page), afterHold);
  assert.deepEqual(await page.locator('.histogram-bar').evaluateAll(bars => bars.map(b => Number(b.dataset.count))), originalCounts);
  await page.locator('#view-standardized').click();
  await wait(page);

  // Enough independent repetitions to inspect the curve and distribution visually.
  await page.locator('#sample-button').evaluate(button => { for (let i = 0; i < 350; i++) button.click(); });
  await wait(page);
  await page.screenshot({ path: path.join(os.tmpdir(), 'clt-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await wait(page);
  await checkLayout(page);
  await page.screenshot({ path: path.join(os.tmpdir(), 'clt-desktop-720.png'), fullPage: true });

  // Add, drag, then remove an interior control point using actual mouse input.
  const plot = await page.locator('#density-chart').boundingBox();
  await page.mouse.click(plot.x + plot.width * 0.55, plot.y + plot.height * 0.45);
  await wait(page);
  assert.equal(await page.locator('.handle').count(), 3);
  assert.equal(await count(page), 0);
  assert.equal(await page.locator('#sample-size').inputValue(), '50');
  const initialMean = await page.locator('#population-mean').getAttribute('data-value');
  const handle = await center(page.locator('.handle').nth(1));
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x + 60, handle.y - 25, { steps: 8 });
  await page.mouse.up();
  await wait(page);
  assert.notEqual(await page.locator('#population-mean').getAttribute('data-value'), initialMean);
  await page.locator('#delete-point').click();
  await wait(page);
  assert.equal(await page.locator('.handle').count(), 2);

  const endpoint = await center(page.locator('.handle').first());
  await page.mouse.move(endpoint.x, endpoint.y);
  await page.mouse.down();
  await page.mouse.move(endpoint.x - 35, endpoint.y + 20, { steps: 8 });
  await page.mouse.up();
  await wait(page);
  const label = await page.locator('.handle').first().getAttribute('aria-label');
  assert.match(label, /x -/, 'Support endpoint can move left of zero');

  // Keyboard repetition and focus loss must not leave a timer running.
  await page.locator('#sample-button').focus();
  const beforeKey = await count(page);
  await page.keyboard.press('Space');
  await wait(page);
  assert.equal(await count(page), beforeKey + 1, 'Keyboard activation adds exactly one sample');
  await page.keyboard.down('Enter');
  await page.waitForTimeout(450);
  await page.locator('#theory-button').focus();
  await page.keyboard.up('Enter');
  await wait(page);
  const afterBlur = await count(page);
  await page.waitForTimeout(250);
  assert.equal(await count(page), afterBlur);

  await page.locator('#reset-button').click();
  await wait(page);
  assert.equal(await count(page), 0);
  assert.equal(await page.locator('#sample-size').inputValue(), '1');
  assert.equal(await page.locator('#population-mean').getAttribute('data-value'), '0.500');
  assert.equal(await page.locator('#population-sd').getAttribute('data-value'), '0.289');
  assert.equal(await page.locator('#view-standardized').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#theory-button').getAttribute('aria-pressed'), 'false');
  console.log('Desktop: layout, sampling, long press, editor, keyboard, reset OK');
  await page.close();
}

async function mobileChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(localURL + '#/1');
  await page.waitForFunction(() => window.Reveal?.isReady() && document.querySelectorAll('.sample-cell').length === 50);
  await wait(page);
  assert.equal(await page.evaluate(() => Reveal.isScrollView()), true);
  await checkLayout(page);
  await fillN(page, 12);
  await page.locator('#sample-button').tap();
  await wait(page);
  assert.equal(await count(page), 1, 'Touch tap adds exactly one sample');
  assert.equal(await page.locator('.sample-cell.is-filled').count(), 12);

  const cdp = await context.newCDPSession(page);
  const button = await center(page.locator('#sample-button'));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: button.x, y: button.y }] });
  await page.waitForTimeout(750);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(page);
  const afterHold = await count(page);
  assert.ok(afterHold >= 15 && afterHold <= 30, `Touch hold generates about 50 samples per second: ${afterHold}`);
  await page.waitForTimeout(250);
  assert.equal(await count(page), afterHold, 'Touch release stops');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: button.x, y: button.y }] });
  await page.waitForTimeout(400);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await wait(page);
  const afterCancel = await count(page);
  await page.waitForTimeout(250);
  assert.equal(await count(page), afterCancel, 'Touch cancellation stops');

  const plot = await page.locator('#density-chart').boundingBox();
  await page.touchscreen.tap(plot.x + plot.width * 0.55, plot.y + plot.height * 0.4);
  await wait(page);
  assert.equal(await page.locator('.handle').count(), 3);
  assert.equal(await count(page), 0);
  const handle = await center(page.locator('.handle').nth(1));
  const beforeDrag = await page.locator('#population-mean').getAttribute('data-value');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: handle.x, y: handle.y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: handle.x + 28, y: handle.y - 22 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(page);
  assert.notEqual(await page.locator('#population-mean').getAttribute('data-value'), beforeDrag);
  assert.equal(await page.evaluate(() => document.getElementById('density-chart').closest('section').scrollTop), 0, 'Dragging density does not scroll page');

  await fillN(page, 50);
  await page.locator('#sample-button').evaluate(button => { for (let i = 0; i < 200; i++) button.click(); });
  await page.locator('#theory-button').tap();
  await wait(page);
  await page.screenshot({ path: path.join(os.tmpdir(), 'clt-mobile.png'), fullPage: false });
  await page.evaluate(() => {
    document.getElementById('density-chart').closest('.scroll-page').scrollIntoView({ block: 'start' });
    document.getElementById('density-chart').closest('section').scrollTo(0, 0);
  });
  await wait(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 375, y: 700 }] });
  for (let y = 650; y >= 300; y -= 50) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 375, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(180);
  assert.ok(await page.evaluate(() => document.getElementById('density-chart').closest('section').scrollTop) > 100, 'Touch swipe outside editor scrolls');
  await page.setViewportSize({ width: 320, height: 720 });
  await wait(page);
  await checkLayout(page);
  await page.screenshot({ path: path.join(os.tmpdir(), 'clt-mobile-320.png'), fullPage: false });
  // Start before the boundary: the same gesture must finish scrolling TLC and leave it.
  await page.locator('#reset-button').scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const section = document.getElementById('density-chart').closest('section');
    section.scrollTop = section.scrollHeight - section.clientHeight - 30;
    section.closest('.scroll-page').scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(150);
  const beforePageScroll = await page.evaluate(() => Reveal.getViewportElement().scrollTop);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 600 }] });
  for (let y = 550; y >= 150; y -= 50) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => Math.abs(document.querySelectorAll('.scroll-page')[2].getBoundingClientRect().top) < 2);
  assert.ok(Math.abs(await page.evaluate(() => Reveal.getViewportElement().scrollTop) - beforePageScroll - 720) < 2,
    'A long gesture advances exactly one full slide');
  // Reverse gesture returns one page; a tiny gesture leaves it in place.
  const swipe = async (start, end) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 280, y: start }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 280, y: end }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await swipe(350, 330);
  await page.waitForTimeout(150);
  assert.ok(Math.abs(await page.locator('.scroll-page').nth(2).evaluate(el => el.getBoundingClientRect().top)) < 2,
    'A tiny gesture does not advance');
  const problem = page.locator('.fragment').filter({ hasText: 'Problema:' });
  assert.equal(await problem.evaluate(el => getComputedStyle(el).visibility), 'hidden');
  await swipe(550, 350);
  await page.waitForFunction(() => document.querySelector('.fragment')?.classList.contains('visible'));
  assert.equal(await problem.locator('strong').textContent(), 'Problema:');
  assert.equal(await problem.evaluate(el => getComputedStyle(el).fontSize),
    await page.locator('.scroll-page').nth(2).locator('p').first().evaluate(el => getComputedStyle(el).fontSize));
  await swipe(250, 450);
  await page.waitForFunction(() => !document.querySelector('.fragment')?.classList.contains('visible'));
  await page.waitForFunction(() => Math.abs(document.querySelectorAll('.scroll-page')[2].getBoundingClientRect().top) < 2);
  await swipe(250, 450);
  await page.waitForFunction(() => Math.abs(document.querySelectorAll('.scroll-page')[1].getBoundingClientRect().top) < 2);
  // Switching layouts must retain the actual interactive nodes and results.
  let savedCount = await count(page);
  for (const width of [1100, 390, 1100]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForFunction(mobile => Reveal.isScrollView() === mobile, width <= 760);
    await page.evaluate(() => Reveal.slide(1));
    await wait(page);
    assert.equal(await count(page), savedCount);
    await page.locator('#sample-button').evaluate(button => button.click());
    await wait(page);
    assert.equal(await count(page), savedCount + 1);
    savedCount++;
  }
  console.log('Mobile: touch, vertical scrolling, continuation past TLC, responsive layout and simulator state OK');
  await context.close();
}

async function startServer() {
  const server = http.createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = pathname === '/slides/' ? 'index.html' : pathname.replace(/^\/slides\//, '');
    const target = path.resolve(root, file);
    if (!target.startsWith(root + path.sep)) { res.writeHead(404); res.end(); return; }
    try {
      const body = await fs.readFile(target);
      const type = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.md': 'text/plain', '.woff2': 'font/woff2' }[path.extname(file)];
      res.setHeader('Content-Type', type || 'application/octet-stream');
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}

async function subpathCheck(browser) {
  {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
    await page.goto(localURL);
    await page.waitForFunction(() => window.Reveal?.isReady());
    assert.equal(await page.locator('.slides > section').count(), 3);
    assert.equal(await page.locator('.slides > section.present h1').count(), 1);
    await page.keyboard.press('ArrowRight');
    await wait(page);
    await page.locator('#sample-button').click();
    await wait(page);
    assert.equal(await count(page), 1);
    assert.equal(await page.locator('.handle').count(), 2);
    assert.equal(await page.locator('#population-mean .katex').count(), 1);
    await page.locator('#density-chart').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => Reveal.getIndices().h), 1);
    await page.locator('#density-chart').evaluate(el => el.blur());
    await page.keyboard.press('ArrowRight');
    const problem = page.locator('.fragment').filter({ hasText: 'Problema:' });
    assert.equal(await problem.evaluate(el => getComputedStyle(el).visibility), 'hidden');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('.fragment')?.classList.contains('visible'));
    assert.equal(await page.evaluate(() => Reveal.getIndices().h), 2);
    await page.waitForFunction(() => location.hash.includes('/2'));
    await page.reload();
    await page.waitForFunction(() => window.Reveal?.isReady());
    assert.equal(await page.evaluate(() => Reveal.getIndices().h), 2);
    await page.close();
    console.log('Static hosting under a repository subpath OK');
  }
}

(async () => {
  const server = await startServer();
  localURL = `http://127.0.0.1:${server.address().port}/slides/`;
  const executablePath = process.env.CHROMIUM_PATH || process.argv[3];
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    await desktopChecks(browser);
    await mobileChecks(browser);
    await subpathCheck(browser);
    assert.deepEqual(errors, [], 'No browser errors');
    console.log('All browser checks passed. Screenshots saved in the system temp directory.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
