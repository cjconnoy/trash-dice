const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const baseUrl = (process.argv[2] || 'http://127.0.0.1:5175').replace(/\/+$/, '');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debugPort = 11900 + Math.floor(Math.random() * 600);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'trash-dice-pwa-'));
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
    if (!/\.html$/i.test(cleanPath)) url.pathname = `${cleanPath}/`;
    return url.toString();
  }
  url.pathname = `${cleanPath}/beta/`.replace(/\/{2,}/g, '/');
  return url.toString();
}

function requestBytes(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    lib.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(requestBytes(new URL(res.headers.location, url).toString()));
        res.resume();
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          bytes: Buffer.concat(chunks)
        });
      });
    }).on('error', reject);
  });
}

async function requestText(url) {
  const response = await requestBytes(url);
  if (response.status !== 200) throw new Error(`${url} returned HTTP ${response.status}`);
  return { text: response.bytes.toString('utf8'), headers: response.headers };
}

function pngInfo(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error('invalid PNG signature');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer.readUInt8(24),
    colorType: buffer.readUInt8(25)
  };
}

async function waitForDebugUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const version = JSON.parse((await requestText(`http://127.0.0.1:${debugPort}/json/version`)).text);
      if (version.webSocketDebuggerUrl) return version.webSocketDebuggerUrl;
    } catch (_) {}
    await sleep(100);
  }
  throw new Error('Chrome debugging endpoint did not start');
}

async function main() {
  const gameUrl = betaPageUrl();
  const manifestUrl = new URL('manifest.webmanifest', gameUrl).toString();
  const swUrl = new URL('sw.js', gameUrl).toString();
  const indexUrl = new URL('index.html', gameUrl).toString();
  const mirrorUrl = new URL('trash-dice.html', gameUrl).toString();

  const manifestResponse = await requestText(manifestUrl);
  const contentType = String(manifestResponse.headers['content-type'] || '');
  if (!/manifest\+json|json/i.test(contentType)) {
    throw new Error(`manifest content-type unsafe: ${contentType || 'missing'}`);
  }
  const manifest = JSON.parse(manifestResponse.text);
  const manifestProblems = [];
  if (manifest.name !== 'Trash Dice Companion') manifestProblems.push(`name=${manifest.name}`);
  if (manifest.short_name !== 'Trash Dice') manifestProblems.push(`short_name=${manifest.short_name}`);
  if (manifest.start_url !== './?source=pwa') manifestProblems.push(`start_url=${manifest.start_url}`);
  if (manifest.scope !== './') manifestProblems.push(`scope=${manifest.scope}`);
  if (manifest.display !== 'standalone') manifestProblems.push(`display=${manifest.display}`);
  if (!manifest.theme_color) manifestProblems.push('missing theme_color');
  if (!manifest.background_color) manifestProblems.push('missing background_color');
  const iconSizes = new Set((manifest.icons || []).map(icon => icon.sizes));
  if (!iconSizes.has('192x192')) manifestProblems.push('missing 192 icon');
  if (!iconSizes.has('512x512')) manifestProblems.push('missing 512 icon');
  if (manifestProblems.length) throw new Error(`manifest unsafe: ${manifestProblems.join(', ')}`);

  const iconReports = [];
  for (const [href, expectedSize, label] of [
    ['icons/trash-dice-192.png', 192, 'manifest 192'],
    ['icons/trash-dice-512.png', 512, 'manifest 512'],
    ['icons/apple-touch-icon-180.png', 180, 'apple touch']
  ]) {
    const response = await requestBytes(new URL(href, gameUrl).toString());
    if (response.status !== 200) throw new Error(`${href} returned HTTP ${response.status}`);
    const info = pngInfo(response.bytes);
    iconReports.push({ label, href, ...info, bytes: response.bytes.length });
    if (info.width !== expectedSize || info.height !== expectedSize) {
      throw new Error(`${href} is ${info.width}x${info.height}, expected ${expectedSize}x${expectedSize}`);
    }
    if (label === 'apple touch' && info.colorType === 6) {
      throw new Error('apple touch icon has alpha; iOS icon must be opaque');
    }
  }

  const index = await requestText(indexUrl);
  const mirror = await requestText(mirrorUrl);
  const htmlProblems = [];
  for (const text of [index.text, mirror.text]) {
    if (!/<link[^>]+rel=["']manifest["'][^>]+href=["']\.\/manifest\.webmanifest["']/i.test(text)) htmlProblems.push('missing manifest link');
    if (!/apple-mobile-web-app-capable/i.test(text)) htmlProblems.push('missing apple capable meta');
    if (!/apple-mobile-web-app-status-bar-style/i.test(text)) htmlProblems.push('missing apple status meta');
    if (!/apple-touch-icon/i.test(text)) htmlProblems.push('missing apple touch icon');
    if (!/name=["']theme-color["']/i.test(text)) htmlProblems.push('missing theme-color');
    if (!/navigator\.serviceWorker\.register\('\.\/sw\.js'/.test(text)) htmlProblems.push('missing scoped service worker registration');
    if (!/source', 'invite'/.test(text)) htmlProblems.push('invite links missing source=invite');
  }
  if (htmlProblems.length) throw new Error(`HTML PWA tags unsafe: ${[...new Set(htmlProblems)].join(', ')}`);

  const sw = await requestText(swUrl);
  if (!/CACHE_VERSION/.test(sw.text) || !/APP_SHELL/.test(sw.text) || !/clients\.claim/.test(sw.text)) {
    throw new Error('service worker does not expose expected shell cache behavior');
  }

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
  async function page(url) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const cdp = (method, params = {}) => send(method, params, sessionId);
    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Page.navigate', { url });
    await sleep(1200);
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
  async function waitEval(pageRef, expression, label, timeout = 12000) {
    const start = Date.now();
    let last;
    while (Date.now() - start < timeout) {
      last = await evalValue(pageRef, expression);
      if (last) return last;
      await sleep(100);
    }
    throw new Error(`timeout ${label}: ${JSON.stringify(last)}`);
  }

  const pwaUrl = new URL(gameUrl);
  pwaUrl.searchParams.set('qa', '1');
  pwaUrl.searchParams.set('source', 'pwa');
  const pwaPage = await page(pwaUrl.toString());
  const sourceProbe = await waitEval(pwaPage, `
    window.TrashDiceDebug && window.TrashDiceDebug.state().pwa.source === 'pwa'
  `, 'pwa source debug');
  const swProbe = await waitEval(pwaPage, `
    (async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registration = await navigator.serviceWorker.ready;
      return !!(registration && registration.active);
    })()
  `, 'service worker active');
  const cacheProbe = await waitEval(pwaPage, `
    (async () => {
      const keys = await caches.keys();
      return keys.some(key => key.includes('trash-dice-beta-pwa-v1'));
    })()
  `, 'service worker cache');

  const iosUrl = new URL(gameUrl);
  iosUrl.searchParams.set('qa', '1');
  iosUrl.searchParams.set('fast', '1');
  iosUrl.searchParams.set('forceqa', '1');
  iosUrl.searchParams.set('gamewin', 'p1');
  iosUrl.searchParams.set('pwaHint', 'ios');
  const iosPage = await page(iosUrl.toString());
  const iosHint = await waitEval(iosPage, `
    (() => {
      const state = window.TrashDiceDebug && window.TrashDiceDebug.state();
      const card = document.getElementById('pwaInstallCard');
      const button = document.getElementById('pwaInstallButton');
      const copy = document.getElementById('pwaInstallCopy');
      const steps = document.getElementById('pwaInstallSteps');
      const rect = card && card.getBoundingClientRect();
      const hintText = (copy ? copy.textContent : '') + ' ' + (steps ? steps.textContent : '');
      return !!(state && state.inlineGameOver && state.pwa.installVisible &&
        state.pwa.installMode === 'ios' &&
        card && !card.hidden && card.classList.contains('is-visible') &&
        button && button.hidden &&
        steps && !steps.hidden &&
        rect && rect.top > window.innerHeight * 0.45 &&
        /Share/.test(hintText) && /Add to Home Screen/.test(hintText) && /Tap Add/.test(hintText));
    })()
  `, 'iOS install hint');

  const androidUrl = new URL(gameUrl);
  androidUrl.searchParams.set('qa', '1');
  androidUrl.searchParams.set('fast', '1');
  androidUrl.searchParams.set('forceqa', '1');
  androidUrl.searchParams.set('gamewin', 'p1');
  androidUrl.searchParams.set('pwaHint', 'android');
  const androidPage = await page(androidUrl.toString());
  const androidHint = await waitEval(androidPage, `
    (() => {
      const state = window.TrashDiceDebug && window.TrashDiceDebug.state();
      const card = document.getElementById('pwaInstallCard');
      const button = document.getElementById('pwaInstallButton');
      return !!(state && state.inlineGameOver && state.pwa.installVisible &&
        state.pwa.installMode === 'android' &&
        card && !card.hidden && card.classList.contains('is-visible') &&
        button && !button.hidden && !button.disabled &&
        /Add to Home Screen/.test(button.textContent));
    })()
  `, 'Android install button');

  console.log(JSON.stringify({
    ok: true,
    gameUrl,
    manifest: {
      start_url: manifest.start_url,
      scope: manifest.scope,
      display: manifest.display,
      iconSizes: [...iconSizes]
    },
    icons: iconReports,
    sourceProbe,
    swProbe,
    cacheProbe,
    iosHint,
    androidHint
  }, null, 2));

  await send('Target.closeTarget', { targetId: pwaPage.targetId });
  await send('Target.closeTarget', { targetId: iosPage.targetId });
  await send('Target.closeTarget', { targetId: androidPage.targetId });
  ws.close();
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
