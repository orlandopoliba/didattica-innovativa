const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.argv[2] || 'playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const errors = [];
  const server = http.createServer(async (req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/deck\//, '') || 'index.html';
    try {
      const file = path.join(root, name);
      res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(file)] || 'text/plain');
      res.end(await fs.readFile(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 }, isMobile: mobile, hasTouch: mobile });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400) errors.push(r.url()); });
      await page.goto(`http://127.0.0.1:${server.address().port}/deck/index.html#/6`);
      await page.waitForFunction(() => document.querySelector('#reg-scatter')?.dataset.count === '5');
      const count = () => page.locator('#reg-scatter').getAttribute('data-count');
      const action = locator => mobile ? locator.tap() : locator.click();
      const scatter = page.locator('#reg-scatter');
      await scatter.scrollIntoViewIfNeeded();
      const box = await scatter.boundingBox();
      const p = { x: box.x + 38 + (box.width - 58) * .4, y: box.y + 18 + (box.height - 48) * .2 };
      if (mobile) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
      await page.waitForFunction(() => document.querySelector('#reg-scatter').dataset.count === '6');
      if (mobile) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
      await page.waitForFunction(() => document.querySelector('#reg-scatter').dataset.count === '5');
      await action(page.locator('#reg-optimize'));
      await page.waitForFunction(() => document.querySelector('#reg-status').textContent.startsWith('Minimo raggiunto'));
      assert.ok(Math.abs(Number(await page.locator('#reg-a').inputValue()) - .78) < 1e-10);
      assert.ok(Math.abs(Number(await page.locator('#reg-b').inputValue()) - 1.18) < 1e-10);
      const surface = page.locator('#reg-surface');
      await surface.scrollIntoViewIfNeeded();
      const before = await surface.getAttribute('data-rotation');
      const s = await surface.boundingBox(), x = s.x + s.width / 2, y = s.y + s.height / 2;
      if (mobile) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 55, y: y + 20 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 55, y + 20, { steps: 5 }); await page.mouse.up();
      }
      await page.waitForTimeout(80);
      assert.notEqual(await surface.getAttribute('data-rotation'), before);
      assert.equal(await page.evaluate(() => Reveal.getIndices().h), 6);
      await action(page.locator('#reg-reset'));
      await page.waitForFunction(() => document.querySelector('#reg-a').value === '-0.4');
      await page.waitForFunction(() => document.querySelector('#reg-surface').dataset.rotation === '-0.65,0.55');
      assert.equal(await count(), '5');
      assert.equal(await surface.getAttribute('data-rotation'), '-0.65,0.55');
      assert.equal(await page.locator('.regression-slide .katex-error').count(), 0);
      // A native slider interaction must update the formula without navigating Reveal.
      const slider = page.locator('#reg-a');
      await slider.scrollIntoViewIfNeeded();
      const initialMSE = await page.locator('#reg-mse').getAttribute('data-value');
      if (mobile) {
        const sb = await slider.boundingBox();
        await page.touchscreen.tap(sb.x + sb.width * .75, sb.y + sb.height / 2);
      } else {
        await slider.focus(); await page.keyboard.press('ArrowRight');
      }
      assert.notEqual(await page.locator('#reg-mse').getAttribute('data-value'), initialMSE);
      assert.equal(await page.evaluate(() => Reveal.getIndices().h), 6);
      await action(page.locator('#reg-reset'));
      // Remove every observation; a single replacement has a non-unique minimum.
      for (const [px, py] of [[1, 2], [3, 3.8], [5, 4.2], [7, 7.4], [9, 8]]) {
        await scatter.scrollIntoViewIfNeeded();
        const cb = await scatter.boundingBox();
        const xx = cb.x + 38 + px / 10 * (cb.width - 58);
        const yy = cb.y + cb.height - 30 - py / 10 * (cb.height - 48);
        if (mobile) await page.touchscreen.tap(xx, yy); else await page.mouse.click(xx, yy);
      }
      await page.waitForFunction(() => document.querySelector('#reg-scatter').dataset.count === '0');
      assert.ok(await page.locator('#reg-optimize').isDisabled());
      assert.match(await page.locator('#reg-mse').textContent(), /non definito/);
      await scatter.focus(); await page.keyboard.press('Enter');
      await action(page.locator('#reg-optimize'));
      await page.waitForFunction(() => document.querySelector('#reg-status').textContent.startsWith('Minimo raggiunto'));
      assert.equal(Number(await page.locator('#reg-mse').getAttribute('data-value')), 0);
      assert.match(await page.locator('#reg-status').textContent(), /Non è unico/);
      await action(page.locator('#reg-reset'));
      for (const width of mobile ? [390, 320] : [1280]) {
        await page.setViewportSize({ width, height: mobile ? 844 : 720 });
        assert.ok(await page.locator('.regression-slide').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      }
      await page.evaluate(() => {
        const section = document.querySelector('.regression-slide').closest('section');
        section.scrollTop = 0;
        section.closest('.scroll-page')?.scrollIntoView({ block: 'start' });
      });
      await page.waitForTimeout(100);
      await page.screenshot({ path: `/tmp/regression-${mobile ? 'mobile' : 'desktop'}.png` });
      console.log(`${mobile ? 'Touch' : 'Desktop'}: points, optimum, rotation, reset, layout OK`);
      await context.close();
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
