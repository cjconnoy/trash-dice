const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = __dirname;
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const appPort = 6000 + Math.floor(Math.random() * 700);
const debugPort = 13300 + Math.floor(Math.random() * 700);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'trash-dice-retail-loop-'));

const viewports = [
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 },
  { name: 'iphone-13-safari', width: 390, height: 664, deviceScaleFactor: 3, mobile: true, screenWidth: 390, screenHeight: 844 },
  { name: 'ipad-portrait', width: 768, height: 920, deviceScaleFactor: 2, mobile: true, screenWidth: 768, screenHeight: 1024 }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  if (filePath.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${appPort}`);
    const safePath = url.pathname === '/' ? 'qa-retail-loop-harness.html' : url.pathname.replace(/^\/+/, '');
    const filePath = path.normalize(path.join(root, safePath));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': contentType(filePath), 'cache-control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(appPort, '127.0.0.1', () => resolve(server)));
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function waitForDebugUrl() {
  for (let i = 0; i < 100; i++) {
    try {
      const version = await requestJson(`http://127.0.0.1:${debugPort}/json/version`);
      if (version.webSocketDebuggerUrl) return version.webSocketDebuggerUrl;
    } catch (_) {}
    await sleep(100);
  }
  throw new Error('Chrome debugging endpoint did not start');
}

async function waitForTarget(predicate, label, timeout = 9000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const targets = await requestJson(`http://127.0.0.1:${debugPort}/json/list`);
    const found = targets.find(predicate);
    if (found) return found;
    await sleep(120);
  }
  throw new Error(`timeout waiting for ${label}`);
}

async function main() {
  const harnessPath = path.join(root, 'qa-retail-loop-harness.html');
  const gamePath = path.join(root, 'ship-html5', 'index.html');
  assert(fs.existsSync(harnessPath), `missing retail harness: ${harnessPath}`);
  assert(fs.existsSync(gamePath), `missing ship build: ${gamePath}`);

  const server = await startServer();
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-audio-output',
    '--disable-popup-blocking',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${debugPort}`,
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  chrome.stderr.on('data', data => { stderr += data.toString(); });

  try {
    const wsUrl = await waitForDebugUrl();
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const requests = [];
    const exceptions = [];
    let msgId = 0;

    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });

    ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Network.requestWillBeSent') {
        requests.push(msg.params.request.url);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const details = msg.params.exceptionDetails || {};
        exceptions.push(details.text || (details.exception && details.exception.description) || JSON.stringify(details));
      }
      if (!msg.id || !pending.has(msg.id)) return;
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result || {});
    });

    const send = (method, params = {}, sessionId = null) => new Promise((resolve, reject) => {
      const id = ++msgId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    });

    async function attachToTarget(targetId, viewport) {
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const cdp = (method, params = {}) => send(method, params, sessionId);
      await cdp('Page.enable');
      await cdp('Runtime.enable');
      await cdp('Network.enable');
      await cdp('Emulation.setDeviceMetricsOverride', viewport);
      if (viewport.mobile) await cdp('Emulation.setTouchEmulationEnabled', { enabled: true });
      return { cdp, targetId, viewport };
    }

    async function openPage(url, viewport) {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      const page = await attachToTarget(targetId, viewport);
      await page.cdp('Page.navigate', { url });
      await waitEval(page, `document.readyState === 'complete'`, `${viewport.name} page loaded`);
      return page;
    }

    async function evalValue(page, expression) {
      const result = await page.cdp('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }

    async function waitEval(page, expression, label, timeout = 9000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const value = await evalValue(page, expression);
        if (value) return value;
        await sleep(120);
      }
      throw new Error(`timeout waiting for ${label}`);
    }

    async function clickSelector(page, selector) {
      await evalValue(page, `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) el.scrollIntoView({ block: 'center', inline: 'center' });
        return true;
      })()`);
      await sleep(120);
      const rect = await evalValue(page, `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height };
      })()`);
      assert(rect && rect.width > 0 && rect.height > 0, `${page.viewport.name}: missing click target ${selector}`);
      await page.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y });
      await page.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
      await page.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    }

    const baseUrl = `http://127.0.0.1:${appPort}/`;
    const gameUrl = `${baseUrl}ship-html5/index.html?source=bigdiscoveries&qa=1`;
    const reports = [];

    for (const viewport of viewports) {
      const harnessUrl = `${baseUrl}qa-retail-loop-harness.html?game=${encodeURIComponent(gameUrl)}`;
      const harnessPage = await openPage(harnessUrl, viewport);
      await evalValue(harnessPage, `document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true`);

      const initial = await evalValue(harnessPage, `window.__retailLoopProbe()`);
      assert(initial.linkTarget === '_blank', `${viewport.name}: retail link target must be _blank`);
      assert(initial.linkRel.includes('noopener'), `${viewport.name}: retail link must use noopener`);
      assert(initial.linkHref.includes('/ship-html5/index.html'), `${viewport.name}: retail link does not point to ship game`);
      assert(initial.linkHref.includes('source=bigdiscoveries'), `${viewport.name}: retail link missing source=bigdiscoveries`);

      await clickSelector(harnessPage, '#qtyPlus');
      await clickSelector(harnessPage, '#cartButton');
      await evalValue(harnessPage, `document.getElementById('playFreeSection').scrollIntoView({ block: 'center' }); true`);
      await sleep(220);
      const beforePlay = await evalValue(harnessPage, `window.__retailLoopProbe()`);
      assert(beforePlay.quantity === 2, `${viewport.name}: harness quantity did not update`);
      assert(beforePlay.cartClicks === 1, `${viewport.name}: harness cart state did not update`);
      assert(beforePlay.playSectionTop > 40 && beforePlay.playSectionTop < beforePlay.viewportHeight - 40, `${viewport.name}: play section not visible`);

      await clickSelector(harnessPage, '#playFreeLink');
      const gameTarget = await waitForTarget(target =>
        target.type === 'page' && target.url.includes('/ship-html5/index.html') && target.url.includes('source=bigdiscoveries'),
        `${viewport.name} game tab`
      );
      await send('Target.activateTarget', { targetId: gameTarget.id });
      const gamePage = await attachToTarget(gameTarget.id, viewport);
      await waitEval(gamePage, `document.readyState === 'complete' && !!window.TrashDiceAnalyticsDebug`, `${viewport.name} game ready`);

      const afterOpenHarness = await evalValue(harnessPage, `window.__retailLoopProbe()`);
      assert(afterOpenHarness.loadedAt === initial.loadedAt, `${viewport.name}: retail page reloaded after play click`);
      assert(afterOpenHarness.loadCount === 1, `${viewport.name}: retail page load count changed`);
      assert(afterOpenHarness.playClicks === 1, `${viewport.name}: retail play click not recorded`);
      assert(afterOpenHarness.quantity === 2, `${viewport.name}: retail quantity was lost`);
      assert(Math.abs(afterOpenHarness.scrollY - beforePlay.scrollY) <= 24, `${viewport.name}: retail scroll position moved unexpectedly`);

      const gameState = await evalValue(gamePage, `(() => ({
        href: location.href,
        source: new URL(location.href).searchParams.get('source'),
        analyticsSource: window.TrashDiceAnalyticsDebug && window.TrashDiceAnalyticsDebug.source,
        openerIsNull: window.opener === null,
        referrer: document.referrer,
        quitButton: !!document.getElementById('quitGameBtn')
      }))()`);
      assert(gameState.source === 'bigdiscoveries', `${viewport.name}: game URL source wrong`);
      assert(gameState.analyticsSource === 'bigdiscoveries', `${viewport.name}: analytics source wrong`);
      assert(gameState.openerIsNull === true, `${viewport.name}: noopener did not isolate opener`);
      assert(gameState.referrer.includes('qa-retail-loop-harness.html'), `${viewport.name}: game referrer missing harness`);
      assert(gameState.quitButton === true, `${viewport.name}: game quit button missing`);

      await evalValue(gamePage, `(() => {
        window.__tdForceQuitFallback = true;
        window.__tdManualQuitProbe = false;
        const btn = document.getElementById('quitGameBtn');
        if (btn) btn.addEventListener('click', () => { window.__tdManualQuitProbe = true; }, { once: true });
        return true;
      })()`);
      await clickSelector(gamePage, '#quitGameBtn');
      await sleep(240);
      const quitInputProbe = await evalValue(gamePage, `(() => ({
        manualClick: !!window.__tdManualQuitProbe,
        sheetVisible: !!(document.getElementById('quitReturnSheet') && !document.getElementById('quitReturnSheet').hidden),
        events: window.TrashDiceAnalyticsDebug.log.map(item => item.eventName),
        buttonRect: (() => {
          const btn = document.getElementById('quitGameBtn');
          if (!btn) return null;
          const r = btn.getBoundingClientRect();
          return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
        })()
      }))()`);
      assert(quitInputProbe.manualClick === true, `${viewport.name}: quit input did not hit button ${JSON.stringify(quitInputProbe)}`);
      assert(quitInputProbe.buttonRect.width >= 88 && quitInputProbe.buttonRect.height >= 42, `${viewport.name}: quit button touch target too small ${JSON.stringify(quitInputProbe)}`);
      if (viewport.width <= 720) {
        assert(quitInputProbe.buttonRect.top >= viewport.height * 0.45, `${viewport.name}: mobile quit button should sit in lower thumb zone ${JSON.stringify(quitInputProbe)}`);
        assert(quitInputProbe.buttonRect.right <= viewport.width - 6, `${viewport.name}: mobile quit button should stay inside right edge ${JSON.stringify(quitInputProbe)}`);
      }
      await waitEval(gamePage, `(() => {
        const sheet = document.getElementById('quitReturnSheet');
        return !!(sheet && !sheet.hidden);
      })()`, `${viewport.name} quit fallback`);
      const quitState = await evalValue(gamePage, `(() => ({
        copy: (document.getElementById('quitReturnCopy') || {}).textContent || '',
        events: window.TrashDiceAnalyticsDebug.log.map(item => item.eventName)
      }))()`);
      assert(quitState.copy.includes('previous page is still open'), `${viewport.name}: fallback copy does not explain previous page`);
      assert(quitState.events.includes('td_quit_click'), `${viewport.name}: missing quit click analytics`);
      assert(quitState.events.includes('td_quit_fallback'), `${viewport.name}: missing quit fallback analytics`);

      await send('Target.closeTarget', { targetId: gameTarget.id });
      await send('Target.activateTarget', { targetId: harnessPage.targetId });
      await sleep(250);
      const afterCloseHarness = await evalValue(harnessPage, `window.__retailLoopProbe()`);
      assert(afterCloseHarness.loadedAt === initial.loadedAt, `${viewport.name}: retail page reloaded after game close`);
      assert(afterCloseHarness.loadCount === 1, `${viewport.name}: retail page load count changed after game close`);
      assert(afterCloseHarness.playClicks === 1, `${viewport.name}: retail play click count changed after game close`);
      assert(afterCloseHarness.quantity === 2, `${viewport.name}: retail quantity lost after game close`);
      assert(Math.abs(afterCloseHarness.scrollY - beforePlay.scrollY) <= 24, `${viewport.name}: retail scroll changed after game close`);

      reports.push({
        viewport: viewport.name,
        status: 'ok',
        retailScrollY: afterCloseHarness.scrollY,
        source: gameState.analyticsSource,
        openerIsNull: gameState.openerIsNull,
        quitEvents: quitState.events.filter(eventName => eventName.startsWith('td_quit_'))
      });
    }

    const forbiddenHits = requests.filter(url => url.includes('bigdiscoveries.com') || url.includes('manifest.webmanifest') || url.includes('sw.js'));
    assert(forbiddenHits.length === 0, `forbidden network requests: ${forbiddenHits.join(', ')}`);
    assert(exceptions.length === 0, `runtime exceptions: ${exceptions.join(' | ')}`);

    console.log(JSON.stringify({
      status: 'RETAIL_LOOP_QA_OK',
      harness: `${baseUrl}qa-retail-loop-harness.html`,
      game: gameUrl,
      viewports: reports,
      requestCount: requests.length
    }, null, 2));

    ws.close();
  } catch (error) {
    if (stderr) console.error(stderr);
    throw error;
  } finally {
    try { chrome.kill(); } catch (_) {}
    server.close();
    for (let i = 0; i < 5; i++) {
      try {
        fs.rmSync(profile, { recursive: true, force: true });
        break;
      } catch (_) {
        await sleep(150);
      }
    }
  }
}

main().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
