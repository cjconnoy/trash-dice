const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = __dirname;
const shipDir = path.join(root, 'ship-html5');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const appPort = 5310 + Math.floor(Math.random() * 600);
const debugPort = 12600 + Math.floor(Math.random() * 700);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'trash-dice-ship-html5-'));
const EXPECTED_START_CTA = 'TAP TO START';
const forbiddenRequests = [
  'manifest.webmanifest',
  'sw.js',
  'beta-ws',
  'trash-dice-beta-room',
  'quickchart.io'
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 },
  { name: 'iphone-13-safari', width: 390, height: 664, deviceScaleFactor: 3, mobile: true, screenWidth: 390, screenHeight: 844 },
  { name: 'ipad-portrait', width: 768, height: 920, deviceScaleFactor: 2, mobile: true, screenWidth: 768, screenHeight: 1024 }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  return 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${appPort}`);
    const safePath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
    const filePath = path.normalize(path.join(shipDir, safePath));
    if (!filePath.startsWith(shipDir)) {
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  if (!fs.existsSync(path.join(shipDir, 'index.html'))) {
    throw new Error(`missing ship build: ${path.join(shipDir, 'index.html')}`);
  }

  const server = await startServer();
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

    async function openPage(url, viewport) {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const cdp = (method, params = {}) => send(method, params, sessionId);
      await cdp('Page.enable');
      await cdp('Runtime.enable');
      await cdp('Network.enable');
      await cdp('Emulation.setDeviceMetricsOverride', viewport);
      if (viewport.mobile) await cdp('Emulation.setTouchEmulationEnabled', { enabled: true });
      await cdp('Page.navigate', { url });
      await sleep(1000);
      return { cdp, targetId, viewport };
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

    const baseUrl = `http://127.0.0.1:${appPort}/`;
    const reports = [];

    for (const viewport of viewports) {
      const page = await openPage(`${baseUrl}?source=qa&qa=1`, viewport);
      await evalValue(page, `document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true`);
      const initial = await evalValue(page, `(() => ({
        title: document.title,
        manifest: !!document.querySelector('link[rel="manifest"]'),
        pwaCard: !!document.getElementById('pwaInstallCard'),
        twoPlayer: !!document.getElementById('betaTwoPlayerBtn'),
        roomPanel: !!document.getElementById('betaRoomPanel'),
        devControls: !!document.querySelector('#devCheatBar,#p0ReviewToggle,#debugBadge'),
        p0Button: !!document.getElementById('devP0Btn'),
        p0ButtonHidden: document.getElementById('devP0Btn') ? getComputedStyle(document.getElementById('devP0Btn')).display === 'none' : false,
        winButton: !!document.getElementById('devWinBtn'),
        loseButton: !!document.getElementById('devLoseBtn'),
        outcomeButtonsHidden: document.getElementById('debugOutcomeControls') ? getComputedStyle(document.getElementById('debugOutcomeControls')).display === 'none' : false,
        quitButton: !!document.getElementById('quitGameBtn'),
        quitRect: (() => {
          const btn = document.getElementById('quitGameBtn');
          if (!btn) return null;
          const r = btn.getBoundingClientRect();
          return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight };
        })(),
        quitSheetHidden: !!(document.getElementById('quitReturnSheet') && document.getElementById('quitReturnSheet').hidden),
        startText: (document.getElementById('startBtn') || {}).textContent || '',
        badgeText: (document.querySelector('.milestone-badge') || {}).textContent || '',
        version: document.body.dataset.trashDiceVersion || '',
        titleLayout: (() => {
          const presenterLogo = document.querySelector('.title-presenter-logo');
          const titleLogo = document.querySelector('.start-overlay .title-wrap.big .title-logo');
          const tagline = document.querySelector('.start-tagline');
          const legal = document.querySelector('.title-legal');
          const startCan = document.querySelector('.start-lurker-can');
          const rect = el => {
            const r = el.getBoundingClientRect();
            return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
          };
          const presenterRect = rect(presenterLogo);
          const titleRect = rect(titleLogo);
          const startCard = document.querySelector('.start-blob-wrap');
          const startCardRect = rect(startCard);
          const startCanRect = rect(startCan);
          const taglineRect = rect(tagline);
          const legalRect = rect(legal);
          return {
            presenterLogoWidth: presenterRect.width,
            presenterToTitle: titleRect.top - presenterRect.bottom,
            titleToStartCard: startCardRect.top - titleRect.bottom,
            startCanToCard: startCardRect.left - startCanRect.right,
            startCardToTagline: taglineRect.top - startCardRect.bottom,
            taglineToLegal: legalRect.top - taglineRect.bottom,
            presenterRect,
            titleRect,
            startCardRect,
            startCanRect,
            taglineRect,
            legalRect
          };
        })()
      }))()`);
      assert(initial.title.includes('Trash Dice'), `${viewport.name}: title missing`);
      assert(initial.manifest === false, `${viewport.name}: manifest link present`);
      assert(initial.pwaCard === false, `${viewport.name}: PWA install card present`);
      assert(initial.twoPlayer === false, `${viewport.name}: 2-player button present`);
      assert(initial.roomPanel === false, `${viewport.name}: room panel present`);
      assert(initial.devControls === false, `${viewport.name}: dev controls present`);
      assert(initial.p0Button === true, `${viewport.name}: P-0 debug button missing`);
      assert(initial.p0ButtonHidden === true, `${viewport.name}: P-0 debug button should hide on title screen`);
      assert(initial.winButton === true, `${viewport.name}: win debug button missing`);
      assert(initial.loseButton === true, `${viewport.name}: lose debug button missing`);
      assert(initial.outcomeButtonsHidden === true, `${viewport.name}: outcome debug buttons should hide on title screen`);
      assert(initial.quitButton === true, `${viewport.name}: quit button missing`);
      assert(initial.quitRect.width >= 88 && initial.quitRect.height >= 42, `${viewport.name}: quit button is too small ${JSON.stringify(initial.quitRect)}`);
      assert(initial.quitRect.right <= initial.quitRect.viewportWidth - 6 && initial.quitRect.left >= 0, `${viewport.name}: quit button is not inside viewport ${JSON.stringify(initial.quitRect)}`);
      if (viewport.width <= 720) {
        assert(initial.quitRect.height >= 46, `${viewport.name}: mobile quit button is too short ${JSON.stringify(initial.quitRect)}`);
        assert(initial.quitRect.top <= 32 && initial.quitRect.left <= 24, `${viewport.name}: mobile quit button should stay in top-left escape position ${JSON.stringify(initial.quitRect)}`);
        const clearTagline = initial.quitRect.top >= initial.titleLayout.taglineRect.bottom + 4 ||
          initial.quitRect.left >= initial.titleLayout.taglineRect.right + 4 ||
          initial.quitRect.right <= initial.titleLayout.taglineRect.left - 4 ||
          initial.quitRect.bottom <= initial.titleLayout.taglineRect.top - 4;
        const clearLegal = initial.quitRect.top >= initial.titleLayout.legalRect.bottom + 4 ||
          initial.quitRect.left >= initial.titleLayout.legalRect.right + 4 ||
          initial.quitRect.right <= initial.titleLayout.legalRect.left - 4 ||
          initial.quitRect.bottom <= initial.titleLayout.legalRect.top - 4;
        assert(clearTagline, `${viewport.name}: mobile quit button overlaps title tagline ${JSON.stringify({ quit: initial.quitRect, tagline: initial.titleLayout.taglineRect })}`);
        assert(clearLegal, `${viewport.name}: mobile quit button overlaps legal copy ${JSON.stringify({ quit: initial.quitRect, legal: initial.titleLayout.legalRect })}`);
      } else {
        assert(initial.quitRect.top <= 24, `${viewport.name}: desktop/tablet quit button should remain easy to find at top right ${JSON.stringify(initial.quitRect)}`);
      }
      assert(initial.quitSheetHidden === true, `${viewport.name}: quit fallback sheet should start hidden`);
      assert(initial.startText.trim() === EXPECTED_START_CTA, `${viewport.name}: start CTA should be ${EXPECTED_START_CTA}`);
      assert(initial.badgeText.trim() === 'BETA WIP - NOT LIVE', `${viewport.name}: dev badge missing`);
      assert(initial.version === 'td-html5-p1-wip-20260604', `${viewport.name}: version data missing`);
      assert(initial.titleLayout.taglineToLegal >= 8, `${viewport.name}: title tagline overlaps legal ${JSON.stringify(initial.titleLayout)}`);
      if (viewport.mobile) {
        assert(initial.titleLayout.presenterToTitle >= 8, `${viewport.name}: mobile presenter overlaps Trash Dice logo ${JSON.stringify(initial.titleLayout)}`);
        assert(initial.titleLayout.startCardToTagline >= 8, `${viewport.name}: mobile tagline overlaps start card ${JSON.stringify(initial.titleLayout)}`);
        if (viewport.width <= 720) {
          assert(initial.titleLayout.presenterLogoWidth <= 125, `${viewport.name}: mobile presenter logo too large ${JSON.stringify(initial.titleLayout)}`);
        } else {
          assert(initial.titleLayout.presenterLogoWidth <= 132, `${viewport.name}: tablet presenter logo too large ${JSON.stringify(initial.titleLayout)}`);
          assert(initial.titleLayout.presenterToTitle >= 28, `${viewport.name}: tablet presenter needs breathing room above Trash Dice logo ${JSON.stringify(initial.titleLayout)}`);
          assert(initial.titleLayout.titleToStartCard >= 28 && initial.titleLayout.titleToStartCard <= 115, `${viewport.name}: tablet title-to-start-card spacing is off ${JSON.stringify(initial.titleLayout)}`);
          assert(initial.titleLayout.startCanRect.left >= 0, `${viewport.name}: tablet title can should not be cut off ${JSON.stringify(initial.titleLayout)}`);
          assert(initial.titleLayout.startCanRect.width >= 120, `${viewport.name}: tablet title can should read as a scene prop ${JSON.stringify(initial.titleLayout)}`);
          assert(initial.titleLayout.startCanToCard >= -24 && initial.titleLayout.startCanToCard <= 36, `${viewport.name}: tablet title can should sit near the start card ${JSON.stringify(initial.titleLayout)}`);
        }
      }

      await evalValue(page, `window.__tdForceQuitFallback = true; document.getElementById('quitGameBtn').click(); true`);
      await waitEval(page, `(() => {
        const sheet = document.getElementById('quitReturnSheet');
        return !!(sheet && !sheet.hidden && document.body.classList.contains('quit-return-open'));
      })()`, `${viewport.name} title quit fallback visible`);
      const titleQuit = await evalValue(page, `(() => ({
        sheetVisible: !document.getElementById('quitReturnSheet').hidden,
        copy: (document.getElementById('quitReturnCopy') || {}).textContent || '',
        events: window.TrashDiceAnalyticsDebug.log.map(item => item.eventName)
      }))()`);
      assert(titleQuit.sheetVisible === true, `${viewport.name}: title quit fallback did not show`);
      assert(titleQuit.copy.length > 20, `${viewport.name}: title quit fallback copy missing`);
      assert(!titleQuit.copy.includes('TD launcher'), `${viewport.name}: title quit fallback leaked internal TD launcher wording ${JSON.stringify(titleQuit)}`);
      assert(titleQuit.events.includes('td_quit_click'), `${viewport.name}: missing title quit click analytics`);
      assert(titleQuit.events.includes('td_quit_fallback'), `${viewport.name}: missing title quit fallback analytics`);
      await evalValue(page, `document.getElementById('quitKeepPlayingBtn').click(); window.__tdForceQuitFallback = false; true`);
      await waitEval(page, `document.getElementById('quitReturnSheet').hidden === true`, `${viewport.name} title quit fallback dismissed`);

      await evalValue(page, `document.getElementById('startBtn').click(); true`);
      await sleep(400);
      const postStart = await evalValue(page, `(() => {
        const qa = window.TrashDiceQA && window.TrashDiceQA.state ? window.TrashDiceQA.state() : null;
        const startBtn = document.getElementById('startBtn');
        const overlay = document.getElementById('startOverlay');
        return {
          qaExists: !!window.TrashDiceQA,
          gameStarted: !!(qa && qa.gameStarted),
          bodyGameStarted: document.body.dataset.gameStarted === 'true',
          startDisabled: !!(startBtn && startBtn.disabled),
          rollDisabled: !!(document.getElementById('rollBtn') && document.getElementById('rollBtn').disabled),
          message: (document.getElementById('message') || {}).textContent || '',
          overlayClass: overlay ? overlay.className : '',
          overlayDisplay: overlay ? getComputedStyle(overlay).display : '',
          analytics: window.TrashDiceAnalyticsDebug ? window.TrashDiceAnalyticsDebug.log.map(item => item.eventName) : [],
          exceptions: ${JSON.stringify(exceptions)}
        };
      })()`);
      assert(postStart.bodyGameStarted && !postStart.rollDisabled, `${viewport.name}: game did not start ${JSON.stringify(postStart)}`);
      const activeLayout = await evalValue(page, `(() => {
        const roll = document.getElementById('rollBtn');
        const panel = document.querySelector('.roll-panel');
        const p0Button = document.getElementById('devP0Btn');
        const outcomeControls = document.getElementById('debugOutcomeControls');
        const quitButton = document.getElementById('quitGameBtn');
        const rr = roll.getBoundingClientRect();
        const pr = panel.getBoundingClientRect();
        const br = p0Button.getBoundingClientRect();
        const or = outcomeControls.getBoundingClientRect();
        const qr = quitButton.getBoundingClientRect();
        return {
          rollVisible: rr.width > 44 && rr.height > 44 && rr.bottom <= window.innerHeight + 1 && rr.top >= -1,
          panelVisible: pr.width > 120 && pr.height > 48 && pr.bottom <= window.innerHeight + 1,
          p0ButtonVisible: getComputedStyle(p0Button).display !== 'none' && br.width > 32 && br.height > 24 && br.right <= window.innerWidth + 1 && br.top >= -1,
          outcomeButtonsVisible: getComputedStyle(outcomeControls).display !== 'none' && or.width > 32 && or.height > 22 && or.right <= window.innerWidth + 1 && or.top >= -1,
          quitButtonVisible: getComputedStyle(quitButton).display !== 'none' && qr.width >= 88 && qr.height >= 42 && qr.right <= window.innerWidth - 6 && qr.left >= 0 && qr.top >= -1 && qr.bottom <= window.innerHeight + 1,
          quitClearsRoll: qr.bottom <= rr.top - 4 || qr.left >= rr.right + 4 || qr.right <= rr.left - 4 || qr.top >= rr.bottom + 4,
          disabled: roll.disabled,
          rollRect: { top: rr.top, bottom: rr.bottom, left: rr.left, right: rr.right, width: rr.width, height: rr.height },
          panelRect: { top: pr.top, bottom: pr.bottom, left: pr.left, right: pr.right, width: pr.width, height: pr.height },
          p0ButtonRect: { top: br.top, bottom: br.bottom, left: br.left, right: br.right, width: br.width, height: br.height },
          outcomeButtonsRect: { top: or.top, bottom: or.bottom, left: or.left, right: or.right, width: or.width, height: or.height },
          quitButtonRect: { top: qr.top, bottom: qr.bottom, left: qr.left, right: qr.right, width: qr.width, height: qr.height },
          viewport: { width: window.innerWidth, height: window.innerHeight }
        };
      })()`);
      assert(activeLayout.rollVisible, `${viewport.name}: roll button not visible in viewport ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.panelVisible, `${viewport.name}: roll panel not visible in viewport ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.p0ButtonVisible, `${viewport.name}: P-0 button not visible in viewport ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.outcomeButtonsVisible, `${viewport.name}: outcome buttons not visible in viewport ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.quitButtonVisible, `${viewport.name}: quit button not visible or not large enough in active game ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.quitClearsRoll, `${viewport.name}: quit button overlaps roll/play action ${JSON.stringify(activeLayout)}`);
      if (viewport.width <= 720) {
        assert(activeLayout.quitButtonRect.top <= 32 && activeLayout.quitButtonRect.left <= 24, `${viewport.name}: active mobile quit button should stay in top-left escape position ${JSON.stringify(activeLayout)}`);
      }
      assert(activeLayout.disabled === false, `${viewport.name}: roll button disabled after start`);

      await evalValue(page, `document.getElementById('rollBtn').click(); true`);
      await waitEval(page, `window.TrashDiceAnalyticsDebug.log.some(item => item.eventName === 'td_first_roll')`, `${viewport.name} first roll analytics`);
      await evalValue(page, `window.TrashDiceQA.gameWin('p1'); true`);
      await waitEval(page, `window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active`, `${viewport.name} game complete`);
      await sleep(1700);
      const terminal = await evalValue(page, `(() => ({
        stillComplete: !!(window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active),
        pwaVisible: !!document.querySelector('#pwaInstallCard.is-visible'),
        titleFanfare: document.getElementById('heroTitle').classList.contains('round-win-title-fanfare') || document.getElementById('heroTitle').classList.contains('round-win-title-sustain'),
        winnerPanel: document.getElementById('p1Inventory').closest('.player-panel').classList.contains('player-payout-fanfare'),
        winnerPile: document.getElementById('p1Inventory').classList.contains('player-payout-fanfare'),
        winnerPraise: document.getElementById('p1StatusBar').classList.contains('payout-praise'),
        winnerLabel: (document.getElementById('p1StatusText') || {}).textContent || '',
        winnerCount: document.getElementById('p1Pool').classList.contains('payout-jackpot'),
        celebratingDice: document.querySelectorAll('#p1Pile .bench-cheer-die').length,
        winTitleCursor: (() => {
          const title = document.getElementById('inlineResultTitle');
          if (!title) return 'missing-title';
          const rect = title.getBoundingClientRect();
          const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return el ? getComputedStyle(el).cursor : 'missing-probe';
        })(),
        events: window.TrashDiceAnalyticsDebug.log.map(item => item.eventName)
      }))()`);
      assert(terminal.stillComplete, `${viewport.name}: game over auto-reset unexpectedly`);
      assert(terminal.pwaVisible === false, `${viewport.name}: PWA hint became visible`);
      assert(terminal.titleFanfare === true, `${viewport.name}: title fanfare missing on player game win ${JSON.stringify(terminal)}`);
      assert(terminal.winnerPanel === true, `${viewport.name}: winner panel fanfare missing ${JSON.stringify(terminal)}`);
      assert(terminal.winnerPile === true, `${viewport.name}: winner dice pile fanfare missing ${JSON.stringify(terminal)}`);
      assert(terminal.winnerPraise === true, `${viewport.name}: winner praise state missing ${JSON.stringify(terminal)}`);
      assert(terminal.winnerLabel === 'WINNER', `${viewport.name}: winner label missing ${JSON.stringify(terminal)}`);
      assert(terminal.winnerCount === true, `${viewport.name}: winner count fanfare missing ${JSON.stringify(terminal)}`);
      assert(terminal.celebratingDice > 0, `${viewport.name}: looping dice celebration missing ${JSON.stringify(terminal)}`);
      assert(terminal.winTitleCursor !== 'none', `${viewport.name}: cursor hidden over congratulations title ${JSON.stringify(terminal)}`);
      await sleep(1700);
      const terminalLoop = await evalValue(page, `(() => ({
        stillComplete: !!(window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active),
        titleFanfare: document.getElementById('heroTitle').classList.contains('round-win-title-fanfare') || document.getElementById('heroTitle').classList.contains('round-win-title-sustain'),
        winnerPanel: document.getElementById('p1Inventory').closest('.player-panel').classList.contains('player-payout-fanfare'),
        winnerLabel: (document.getElementById('p1StatusText') || {}).textContent || '',
        celebratingDice: document.querySelectorAll('#p1Pile .bench-cheer-die').length
      }))()`);
      assert(terminalLoop.stillComplete, `${viewport.name}: game over cleared before Play Again ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.titleFanfare === true, `${viewport.name}: title fanfare did not persist ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.winnerPanel === true, `${viewport.name}: winner panel fanfare did not persist ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.winnerLabel === 'WINNER', `${viewport.name}: winner label did not persist ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.celebratingDice > 0, `${viewport.name}: dice celebration did not loop ${JSON.stringify(terminalLoop)}`);
      await evalValue(page, `document.getElementById('rollBtn').click(); true`);
      await waitEval(page, `!window.TrashDiceQA.state().inlineGameOver && document.body.dataset.gameStarted === 'true'`, `${viewport.name} play again restart`);
      const terminalCleared = await evalValue(page, `(() => ({
        titleFanfare: document.getElementById('heroTitle').classList.contains('round-win-title-fanfare') || document.getElementById('heroTitle').classList.contains('round-win-title-sustain'),
        winnerPanel: document.getElementById('p1Inventory').closest('.player-panel').classList.contains('player-payout-fanfare'),
        winnerPile: document.getElementById('p1Inventory').classList.contains('player-payout-fanfare'),
        winnerPraise: document.getElementById('p1StatusBar').classList.contains('payout-praise'),
        winnerCount: document.getElementById('p1Pool').classList.contains('payout-jackpot'),
        celebratingDice: document.querySelectorAll('.bench-cheer-die').length
      }))()`);
      assert(terminalCleared.titleFanfare === false, `${viewport.name}: title fanfare leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      assert(terminalCleared.winnerPanel === false, `${viewport.name}: winner panel fanfare leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      assert(terminalCleared.winnerPile === false, `${viewport.name}: winner dice pile fanfare leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      assert(terminalCleared.winnerPraise === false, `${viewport.name}: winner praise leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      assert(terminalCleared.winnerCount === false, `${viewport.name}: winner count fanfare leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      assert(terminalCleared.celebratingDice === 0, `${viewport.name}: dice celebration leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      ['td_session_start', 'td_game_start', 'td_first_roll', 'td_game_complete', 'td_game_win'].forEach(eventName => {
        assert(terminal.events.includes(eventName), `${viewport.name}: missing analytics event ${eventName}`);
      });

      await evalValue(page, `window.__tdForceQuitFallback = true; document.getElementById('quitGameBtn').click(); true`);
      await waitEval(page, `(() => {
        const sheet = document.getElementById('quitReturnSheet');
        return !!(sheet && !sheet.hidden && document.body.classList.contains('quit-return-open'));
      })()`, `${viewport.name} quit fallback visible`);
      const quitFallback = await evalValue(page, `(() => ({
        sheetVisible: !document.getElementById('quitReturnSheet').hidden,
        copy: (document.getElementById('quitReturnCopy') || {}).textContent || '',
        events: window.TrashDiceAnalyticsDebug.log.map(item => item.eventName)
      }))()`);
      assert(quitFallback.sheetVisible === true, `${viewport.name}: quit fallback did not show`);
      assert(quitFallback.copy.length > 20, `${viewport.name}: quit fallback copy missing`);
      assert(quitFallback.events.includes('td_quit_click'), `${viewport.name}: missing quit click analytics`);
      assert(quitFallback.events.includes('td_quit_fallback'), `${viewport.name}: missing quit fallback analytics`);

      await evalValue(page, `document.getElementById('quitKeepPlayingBtn').click(); true`);
      await waitEval(page, `document.getElementById('quitReturnSheet').hidden === true`, `${viewport.name} quit fallback dismissed`);
      const quitDismissed = await evalValue(page, `window.TrashDiceAnalyticsDebug.log.map(item => item.eventName)`);
      assert(quitDismissed.includes('td_quit_keep_playing'), `${viewport.name}: missing quit keep-playing analytics`);

      reports.push({ viewport: viewport.name, status: 'ok', events: quitDismissed });
    }

    const roomProbe = await openPage(`${baseUrl}?source=qa&qa=1&room=1234`, viewports[0]);
    const roomState = await evalValue(roomProbe, `(() => ({
      roomPanel: !!document.getElementById('betaRoomPanel'),
      twoPlayerButton: !!document.getElementById('betaTwoPlayerBtn'),
      multiplayerActiveClass: document.body.classList.contains('beta-multiplayer-active'),
      startText: (document.getElementById('startBtn') || {}).textContent || ''
    }))()`);
    assert(roomState.roomPanel === false, 'room probe: room panel present');
    assert(roomState.twoPlayerButton === false, 'room probe: 2-player button present');
    assert(roomState.multiplayerActiveClass === false, 'room probe: multiplayer class should stay inactive');
    assert(roomState.startText.trim() === EXPECTED_START_CTA, 'room probe: start CTA changed');

    const p0Probe = await openPage(`${baseUrl}?source=qa&qa=1`, viewports[0]);
    await evalValue(p0Probe, `document.getElementById('startBtn').click(); true`);
    await waitEval(p0Probe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, 'P-0 probe game start');
    const p0On = await evalValue(p0Probe, `(() => {
      const btn = document.getElementById('devP0Btn');
      btn.click();
      const qa = window.TrashDiceQA.state();
      return {
        buttonText: btn.textContent.trim(),
        ariaPressed: btn.getAttribute('aria-pressed'),
        p0Active: !!(qa.p0Autoplay || qa.p0ReviewMode),
        p0ButtonVisible: qa.p0ButtonVisible,
        bodyP0: document.body.classList.contains('debug-p0') || document.body.classList.contains('p0-mode')
      };
    })()`);
    assert(p0On.buttonText === 'P1', `P-0 probe: button did not switch to P1 ${JSON.stringify(p0On)}`);
    assert(p0On.ariaPressed === 'true', `P-0 probe: aria pressed not true ${JSON.stringify(p0On)}`);
    assert(p0On.p0Active === true, `P-0 probe: autoplay did not activate ${JSON.stringify(p0On)}`);
    assert(p0On.p0ButtonVisible === true, `P-0 probe: button not visible after start ${JSON.stringify(p0On)}`);
    assert(p0On.bodyP0 === true, `P-0 probe: body mode class missing ${JSON.stringify(p0On)}`);
    await waitEval(p0Probe, `window.TrashDiceQA.state().totalRolls > 0`, 'P-0 probe CPU-vs-CPU first roll', 7000);
    const p0Rolling = await evalValue(p0Probe, `(() => {
      const qa = window.TrashDiceQA.state();
      return {
        totalRolls: qa.totalRolls,
        current: qa.current,
        message: (document.getElementById('message') || {}).textContent || ''
      };
    })()`);
    assert(p0Rolling.totalRolls > 0, `P-0 probe: CPU-vs-CPU did not roll ${JSON.stringify(p0Rolling)}`);
    const p0Off = await evalValue(p0Probe, `(() => {
      const btn = document.getElementById('devP0Btn');
      btn.click();
      const qa = window.TrashDiceQA.state();
      return {
        buttonText: btn.textContent.trim(),
        ariaPressed: btn.getAttribute('aria-pressed'),
        p0Active: !!(qa.p0Autoplay || qa.p0ReviewMode),
        p0ButtonVisible: qa.p0ButtonVisible
      };
    })()`);
    assert(p0Off.buttonText === 'P-0', `P-0 probe: button did not switch back to P-0 ${JSON.stringify(p0Off)}`);
    assert(p0Off.ariaPressed === 'false', `P-0 probe: aria pressed not false ${JSON.stringify(p0Off)}`);
    assert(p0Off.p0Active === false, `P-0 probe: autoplay did not stop ${JSON.stringify(p0Off)}`);
    assert(p0Off.p0ButtonVisible === true, `P-0 probe: button hidden after stop ${JSON.stringify(p0Off)}`);

    for (const outcome of [
      { id: 'devWinBtn', winner: 'p1', label: 'win' },
      { id: 'devLoseBtn', winner: 'p2', label: 'lose' }
    ]) {
      const outcomeProbe = await openPage(`${baseUrl}?source=qa&qa=1&outcome=${outcome.label}`, viewports[0]);
      await evalValue(outcomeProbe, `document.getElementById('startBtn').click(); true`);
      await waitEval(outcomeProbe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, `${outcome.label} probe game start`);
      await evalValue(outcomeProbe, `document.getElementById(${JSON.stringify(outcome.id)}).click(); true`);
      await waitEval(outcomeProbe, `window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active`, `${outcome.label} probe wrap-up`);
      const outcomeState = await evalValue(outcomeProbe, `(() => {
        const state = window.TrashDiceQA.state();
        return {
          winner: state.inlineGameOver && state.inlineGameOver.winner,
          active: state.inlineGameOver && state.inlineGameOver.active,
          rollButtonText: (document.getElementById('rollBtn') || {}).textContent || '',
          outcomeVisible: getComputedStyle(document.getElementById('debugOutcomeControls')).display !== 'none'
        };
      })()`);
      assert(outcomeState.active === true, `${outcome.label} probe: wrap-up not active ${JSON.stringify(outcomeState)}`);
      assert(outcomeState.winner === outcome.winner, `${outcome.label} probe: wrong winner ${JSON.stringify(outcomeState)}`);
      assert(outcomeState.rollButtonText.includes('PLAY AGAIN'), `${outcome.label} probe: play-again CTA missing ${JSON.stringify(outcomeState)}`);
      assert(outcomeState.outcomeVisible === true, `${outcome.label} probe: outcome buttons hidden after wrap-up ${JSON.stringify(outcomeState)}`);
    }

    const forbiddenHits = requests.filter(url => forbiddenRequests.some(token => url.includes(token)));
    assert(forbiddenHits.length === 0, `forbidden network requests: ${forbiddenHits.join(', ')}`);
    const fullLogoRequests = requests.filter(url => url.includes('assets/brand/trash-dice-logo.png'));
    assert(fullLogoRequests.length === 0, `full title logo PNG should not be requested in WebP-capable browsers: ${fullLogoRequests.join(', ')}`);
    const titleLogoRequests = requests.filter(url => url.includes('assets/brand/trash-dice-logo-title.webp'));
    assert(titleLogoRequests.length > 0, 'fast title logo WebP was not requested');

    console.log(JSON.stringify({
      status: 'SHIP_HTML5_QA_OK',
      url: baseUrl,
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
