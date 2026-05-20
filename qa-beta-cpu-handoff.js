const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const baseUrl = (process.argv[2] || 'http://127.0.0.1:5175').replace(/\/+$/, '');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debugPort = 12800 + Math.floor(Math.random() * 700);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'trash-dice-cpu-handoff-'));
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
  if (!/\/beta(?:-[a-z0-9]+)?$/i.test(cleanPath) && !/\.html$/i.test(cleanPath)) {
    url.pathname = `${cleanPath}/beta/`.replace(/\/{2,}/g, '/');
  }
  url.searchParams.set('qa', '1');
  url.searchParams.set('fullfx', '1');
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

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const cdp = (method, params = {}) => send(method, params, sessionId);
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Page.navigate', { url: betaPageUrl() });
  await sleep(900);

  async function evalValue(expression) {
    const result = await cdp('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }

  const report = await evalValue(`
    (async () => {
      document.getElementById('startBtn').click();
      const waitUntil = (predicate, label, timeout = 9000) => new Promise((resolve, reject) => {
        const start = performance.now();
        const tick = () => {
          try {
            const value = predicate();
            if (value) return resolve(value);
          } catch (error) {
            return reject(error);
          }
          if (performance.now() - start > timeout) return reject(new Error('timeout ' + label));
          requestAnimationFrame(tick);
        };
        tick();
      });

      await waitUntil(() => {
        if (!window.TrashDiceQA || window.TrashDiceQA.state().current !== 'p1') return false;
        return !document.getElementById('rollBtn').disabled &&
          /YELLOW PLAYER STARTS|YELLOW PLAYER ROLL/.test(document.getElementById('message').textContent);
      }, 'game start settled');
      const place = await window.TrashDiceQA.cpuHandoffProbe(1, 'place');
      const trash = await window.TrashDiceQA.cpuHandoffProbe(1, 'trash');
      return { place, trash };
    })()
  `);

  await send('Target.closeTarget', { targetId });
  ws.close();

  const maxHandoffMs = 430;
  const branches = report ? [report.place, report.trash].filter(Boolean) : [];
  const ok = branches.length === 2 && branches.every(branch => branch.handoffMs <= maxHandoffMs);
  console.log(JSON.stringify({ ok, maxHandoffMs, report }, null, 2));
  if (!ok) {
    const summary = branches.map(branch => `${branch.completionMessage}:${branch.handoffMs}ms`).join(', ');
    throw new Error(`CPU-to-player handoff exceeded ${maxHandoffMs}ms (${summary || 'no branch report'})`);
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
