const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const baseUrl = (process.argv[2] || 'http://127.0.0.1:5175').replace(/\/+$/, '');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debugPort = 12100 + Math.floor(Math.random() * 700);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'trash-dice-ipad-layout-'));
const viewports = [
  {
    name: 'ipad-portrait-desktop-safari',
    width: 1024,
    height: 980,
    deviceScaleFactor: 2,
    mobile: true,
    screenWidth: 1024,
    screenHeight: 1366
  },
  {
    name: 'ipad-mini-portrait',
    width: 768,
    height: 920,
    deviceScaleFactor: 2,
    mobile: true,
    screenWidth: 768,
    screenHeight: 1024
  }
];

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--disable-audio-output',
  '--mute-audio',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${debugPort}`,
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

let stderr = '';
chrome.stderr.on('data', data => { stderr += data.toString(); });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function betaPageUrl() {
  const url = new URL(baseUrl);
  const cleanPath = url.pathname.replace(/\/+$/, '');
  if (/\/beta(?:-[a-z0-9]+)?$/i.test(cleanPath) || /\.html$/i.test(cleanPath)) {
    return url.toString();
  }
  url.pathname = `${cleanPath}/beta/`.replace(/\/{2,}/g, '/');
  return url.toString();
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (error) { reject(error); }
      });
    }).on('error', reject);
  });
}

async function waitForDebugUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const version = await requestJson(`http://127.0.0.1:${debugPort}/json/version`);
      if (version.webSocketDebuggerUrl) return version.webSocketDebuggerUrl;
    } catch (_) {}
    await sleep(100);
  }
  throw new Error('Chrome debugging endpoint did not start');
}

async function main() {
  const wsUrl = await waitForDebugUrl();
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let msgId = 0;

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
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

  async function openPage(url, viewport) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const cdp = (method, params = {}) => send(method, params, sessionId);
    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Emulation.setDeviceMetricsOverride', viewport);
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: true });
    await cdp('Page.navigate', { url });
    await sleep(900);
    return { targetId, cdp };
  }

  async function evalValue(pageRef, expression) {
    const result = await pageRef.cdp('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }

  async function waitEval(pageRef, expression, label, timeout = 9000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const value = await evalValue(pageRef, expression);
      if (value) return value;
      await sleep(100);
    }
    throw new Error(`timeout ${label}`);
  }

  const gameUrl = betaPageUrl();
  const reports = [];

  for (const viewport of viewports) {
    const page = await openPage(gameUrl, viewport);
    await evalValue(page, `document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true`);
    await evalValue(page, `document.getElementById('startBtn').click(); true`);
    await waitEval(page, `window.TrashDiceDebug && window.TrashDiceDebug.state().gameStarted`, `${viewport.name} game start`);
    await sleep(700);

    const report = await evalValue(page, `
      (() => {
        const pick = selector => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height
          };
        };
        const title = pick('.title-wrap:not(.big)');
        const tagline = pick('.tagline');
        const green = pick('.green-panel');
        const board = pick('.board-scene');
        const yellow = pick('.yellow-panel');
        const roll = pick('.roll-panel');
        const message = pick('.message');
        const badge = pick('.milestone-badge');
        const problems = [];
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const required = { title, tagline, green, board, yellow, roll, message };
        const visibleRects = [title, tagline, green, board, yellow, roll, message]
          .filter(rect => rect && rect.width > 0 && rect.height > 0);
        const visibleBottom = Math.max(...visibleRects.map(rect => rect.bottom));

        if (title.top < -2) problems.push('title clipped above viewport');
        if (visibleBottom > viewport.height - 8) problems.push('active game content extends below viewport');
        if (green.bottom > board.top + 4) problems.push('green panel overlaps board scene');
        if (board.bottom > yellow.top + 4) problems.push('board scene overlaps yellow panel');
        if (yellow.bottom > roll.top + 4) problems.push('yellow panel overlaps roll panel');
        if (message.width > 0 && message.height > 0 && roll.bottom > message.top + 4) {
          problems.push('roll panel overlaps message');
        }
        if (roll.bottom > viewport.height - 42) problems.push('roll panel too close to iPad Safari bottom chrome');
        if (message.width > 0 && message.height > 0 && message.bottom > viewport.height - 8) {
          problems.push('message clipped below viewport');
        }
        if (badge && roll && badge.right > roll.left && badge.left < roll.right && badge.bottom > roll.top && badge.top < roll.bottom) {
          problems.push('milestone badge overlaps roll panel');
        }

        return {
          viewport,
          bodyScrollHeight: document.body.scrollHeight,
          visibleBottom,
          required,
          badge,
          problems
        };
      })()
    `);

    reports.push({ name: viewport.name, ...report });
    await send('Target.closeTarget', { targetId: page.targetId });
  }

  ws.close();

  const failures = reports.filter(report => report.problems.length);
  console.log(JSON.stringify({ ok: failures.length === 0, reports }, null, 2));
  if (failures.length) {
    throw new Error(`iPad layout failed: ${failures.map(report => `${report.name}: ${report.problems.join(', ')}`).join(' | ')}`);
  }
}

main()
  .catch(error => {
    console.error(error && error.stack ? error.stack : String(error));
    const chromeLines = stderr.split(/\r?\n/).filter(Boolean).slice(-8);
    if (chromeLines.length) console.error(chromeLines.join('\n'));
    process.exitCode = 1;
  })
  .finally(() => {
    chrome.kill('SIGKILL');
    setTimeout(() => {
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
    }, 250);
  });
