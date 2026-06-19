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
const IPAD_OS16_USER_AGENT = 'Mozilla/5.0 (iPad; CPU OS 16_7_16 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const IPAD_OS18_USER_AGENT = 'Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const forbiddenRequests = [
  'manifest.webmanifest',
  'sw.js',
  'beta-ws',
  'trash-dice-beta-room',
  'quickchart.io'
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 },
  { name: 'iphone-se-visible', width: 375, height: 548, deviceScaleFactor: 2, mobile: true, screenWidth: 375, screenHeight: 667 },
  { name: 'iphone-13-safari', width: 390, height: 664, deviceScaleFactor: 3, mobile: true, screenWidth: 390, screenHeight: 844 },
  { name: 'ipad-portrait', width: 768, height: 920, deviceScaleFactor: 2, mobile: true, screenWidth: 768, screenHeight: 1024 },
  { name: 'ipad-landscape-visible', width: 1024, height: 690, deviceScaleFactor: 2, mobile: true, screenWidth: 1024, screenHeight: 768 }
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
      await send('Target.activateTarget', { targetId });
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const cdp = (method, params = {}) => send(method, params, sessionId);
      await cdp('Page.enable');
      await cdp('Runtime.enable');
      await cdp('Network.enable');
      if (viewport.userAgent) {
        await cdp('Network.setUserAgentOverride', {
          userAgent: viewport.userAgent,
          platform: viewport.platform || ''
        });
      }
      await cdp('Emulation.setDeviceMetricsOverride', viewport);
      if (viewport.mobile) await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
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
    const productionLikeBaseUrl = `http://lvh.me:${appPort}/`;
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
        audioMuteButton: !!document.getElementById('audioMuteBtn'),
        quitRect: (() => {
          const btn = document.getElementById('quitGameBtn');
          if (!btn) return null;
          const r = btn.getBoundingClientRect();
          return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight };
        })(),
        audioMute: (() => {
          const btn = document.getElementById('audioMuteBtn');
          const quit = document.getElementById('quitGameBtn');
          if (!btn || !quit) return null;
          const r = btn.getBoundingClientRect();
          const q = quit.getBoundingClientRect();
          return {
            pressed: btn.getAttribute('aria-pressed'),
            label: btn.getAttribute('aria-label'),
            title: btn.title,
            iconOnVisible: getComputedStyle(btn.querySelector('.audio-mute-icon-on')).display !== 'none',
            iconMutedVisible: getComputedStyle(btn.querySelector('.audio-mute-icon-muted')).display !== 'none',
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            left: r.left,
            width: r.width,
            height: r.height,
            visible: getComputedStyle(btn).display !== 'none' && r.width >= 44 && r.height >= 44 && r.left >= 0 && r.right <= window.innerWidth + 1 && r.top >= -1 && r.bottom <= window.innerHeight + 1,
            clearsQuit: r.bottom <= q.top - 4 || r.left >= q.right + 4 || r.right <= q.left - 4 || r.top >= q.bottom + 4
          };
        })(),
        quitSheetHidden: !!(document.getElementById('quitReturnSheet') && document.getElementById('quitReturnSheet').hidden),
        startText: (document.getElementById('startBtn') || {}).textContent || '',
        badgeText: (document.querySelector('.milestone-badge') || {}).textContent || '',
        betaWipCopyPresent: document.body.textContent.includes('BETA WIP') || document.body.textContent.includes('NOT LIVE'),
        legacyIpadGuidance: (() => {
          const note = document.getElementById('legacyIpadGuidance');
          if (!note) return null;
          const r = note.getBoundingClientRect();
          return {
            text: note.textContent.trim(),
            visible: getComputedStyle(note).display !== 'none' && r.width > 0 && r.height > 0,
            rect: { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height }
          };
        })(),
        badgeRect: (() => {
          const badge = document.querySelector('.milestone-badge');
          if (!badge) return null;
          const r = badge.getBoundingClientRect();
          return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
        })(),
        activeAnimationCount: document.getAnimations().filter(animation => animation.playState === 'running').length,
        tabletEffectsLite: document.body.classList.contains('tablet-effects-lite'),
        mobileRollSmoothing: document.body.classList.contains('mobile-roll-smoothing'),
        version: document.body.dataset.trashDiceVersion || '',
        hiddenGameSceneAnimationsPaused: (() => {
          const heroFrame = document.querySelector('#heroTitle .retail-logo-frame');
          const heroGlint = heroFrame ? getComputedStyle(heroFrame, '::after').animationName : 'missing';
          const canGlint = document.querySelector('.can-hero-glint');
          const lidGlint = document.querySelector('.lid-edge-glint');
          const canSvg = document.querySelector('#trashCan > svg');
          return heroGlint === 'none' &&
            (!canGlint || getComputedStyle(canGlint).animationName === 'none') &&
            (!lidGlint || getComputedStyle(lidGlint).animationName === 'none') &&
            (!canSvg || getComputedStyle(canSvg).animationName === 'none');
        })(),
        titleLogoGlint: (() => {
          const frame = document.querySelector('.start-overlay .retail-logo-frame');
          const logo = document.querySelector('.start-overlay .title-wrap.big .title-logo');
          if (!frame || !logo) return null;
          const fr = frame.getBoundingClientRect();
          const lr = logo.getBoundingClientRect();
          const frameStyle = getComputedStyle(frame);
          const glintStyle = getComputedStyle(frame, '::after');
          return {
            animationName: glintStyle.animationName,
            backgroundPosition: glintStyle.backgroundPosition,
            backgroundSize: glintStyle.backgroundSize,
            clipPath: glintStyle.clipPath,
            frameContain: frameStyle.contain,
            frameOverflow: frameStyle.overflow,
            duplicateImageCount: document.querySelectorAll('.start-overlay .retail-logo-glint-img').length,
            frameWidth: fr.width,
            logoWidth: lr.width,
            maskImage: glintStyle.maskImage || '',
            transform: glintStyle.transform
          };
        })(),
        titleLayout: (() => {
          const presenterLogo = document.querySelector('.title-presenter-logo');
          const titleLogo = document.querySelector('.start-overlay .title-wrap.big .title-logo');
          const tagline = document.querySelector('.start-tagline');
          const legal = document.querySelector('.title-legal');
          const studioLabel = document.querySelector('.title-studio-label');
          const odgLogo = document.querySelector('.title-odg-wordmark');
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
          const odgRect = rect(odgLogo);
          return {
            presenterLogoWidth: presenterRect.width,
            presenterToTitle: titleRect.top - presenterRect.bottom,
            titleToStartCard: startCardRect.top - titleRect.bottom,
            startCanToCard: startCardRect.left - startCanRect.right,
            startCardToTagline: taglineRect.top - startCardRect.bottom,
            taglineToLegal: legalRect.top - taglineRect.bottom,
            studioLabelText: studioLabel ? studioLabel.textContent.trim() : '',
            odgLogoSrc: odgLogo ? odgLogo.getAttribute('src') : '',
            odgLogoAlt: odgLogo ? odgLogo.getAttribute('alt') : '',
            odgCenterOffset: odgRect.left + odgRect.width / 2 - window.innerWidth / 2,
            presenterRect,
            titleRect,
            startCardRect,
            startCanRect,
            taglineRect,
            legalRect,
            odgRect
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
      assert(initial.audioMuteButton === true, `${viewport.name}: mute button missing`);
      assert(initial.quitRect.width >= 88 && initial.quitRect.height >= 42, `${viewport.name}: quit button is too small ${JSON.stringify(initial.quitRect)}`);
      assert(initial.quitRect.right <= initial.quitRect.viewportWidth - 6 && initial.quitRect.left >= 0, `${viewport.name}: quit button is not inside viewport ${JSON.stringify(initial.quitRect)}`);
      assert(initial.audioMute && initial.audioMute.visible === true, `${viewport.name}: mute button is not visible/tappable ${JSON.stringify(initial.audioMute)}`);
      assert(initial.audioMute.clearsQuit === true, `${viewport.name}: mute button overlaps Done ${JSON.stringify(initial.audioMute)}`);
      assert(initial.audioMute.pressed === 'false' && initial.audioMute.label === 'Mute sound' && initial.audioMute.iconOnVisible === true && initial.audioMute.iconMutedVisible === false, `${viewport.name}: mute button initial state is wrong ${JSON.stringify(initial.audioMute)}`);
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
      assert(initial.badgeText.trim() === '' && initial.betaWipCopyPresent === false, `${viewport.name}: beta WIP badge/copy should not be visible in retail ${JSON.stringify(initial)}`);
      assert(initial.legacyIpadGuidance && initial.legacyIpadGuidance.visible === false, `${viewport.name}: legacy iPad guidance should stay hidden outside legacy profile ${JSON.stringify(initial.legacyIpadGuidance)}`);
      assert(initial.version === 'td-html5-p1-wip-20260604', `${viewport.name}: version data missing`);
      assert(initial.hiddenGameSceneAnimationsPaused === true, `${viewport.name}: hidden game-scene animations should pause behind title overlay ${JSON.stringify(initial)}`);
      if (viewport.mobile && viewport.width > 720) {
        assert(initial.tabletEffectsLite === true, `${viewport.name}: tablet effects lite class missing ${JSON.stringify(initial)}`);
        assert(initial.mobileRollSmoothing === true, `${viewport.name}: tablet should use mobile roll smoothing ${JSON.stringify(initial)}`);
        assert(initial.activeAnimationCount <= 9, `${viewport.name}: tablet title has too many running animations ${JSON.stringify(initial)}`);
      } else {
        assert(initial.tabletEffectsLite === false, `${viewport.name}: tablet effects lite class applied outside tablet viewport ${JSON.stringify(initial)}`);
      }
      assert(initial.titleLogoGlint && initial.titleLogoGlint.animationName === 'retailLogoGlint', `${viewport.name}: title logo glint animation missing ${JSON.stringify(initial)}`);
      assert(initial.titleLogoGlint.duplicateImageCount === 0, `${viewport.name}: title logo glint should not use duplicate logo bitmap ${JSON.stringify(initial.titleLogoGlint)}`);
      assert(initial.titleLogoGlint.frameWidth <= initial.titleLogoGlint.logoWidth + 2, `${viewport.name}: title logo glint frame should not span the page ${JSON.stringify(initial.titleLogoGlint)}`);
      assert(initial.titleLogoGlint.frameOverflow === 'visible' && initial.titleLogoGlint.frameContain === 'none', `${viewport.name}: title logo frame should not clip drop-shadow/backing paint ${JSON.stringify(initial.titleLogoGlint)}`);
      assert(initial.titleLogoGlint.clipPath === 'none' && initial.titleLogoGlint.maskImage !== 'none' && initial.titleLogoGlint.backgroundSize !== 'auto', `${viewport.name}: title logo glint should use a masked horizontal background sweep ${JSON.stringify(initial.titleLogoGlint)}`);
      const muteToggle = await evalValue(page, `(() => {
        const btn = document.getElementById('audioMuteBtn');
        btn.click();
        const muted = {
          pressed: btn.getAttribute('aria-pressed'),
          label: btn.getAttribute('aria-label'),
          iconOnVisible: getComputedStyle(btn.querySelector('.audio-mute-icon-on')).display !== 'none',
          iconMutedVisible: getComputedStyle(btn.querySelector('.audio-mute-icon-muted')).display !== 'none',
          bodyMuted: document.body.classList.contains('audio-muted'),
          audioMuted: window.__odgAudioStatus ? window.__odgAudioStatus().muted : null,
          stored: window.localStorage.getItem('trash-dice-audio-muted')
        };
        btn.click();
        const unmuted = {
          pressed: btn.getAttribute('aria-pressed'),
          label: btn.getAttribute('aria-label'),
          iconOnVisible: getComputedStyle(btn.querySelector('.audio-mute-icon-on')).display !== 'none',
          iconMutedVisible: getComputedStyle(btn.querySelector('.audio-mute-icon-muted')).display !== 'none',
          bodyMuted: document.body.classList.contains('audio-muted'),
          audioMuted: window.__odgAudioStatus ? window.__odgAudioStatus().muted : null,
          stored: window.localStorage.getItem('trash-dice-audio-muted')
        };
        return { muted, unmuted };
      })()`);
      assert(muteToggle.muted.pressed === 'true' && muteToggle.muted.label === 'Mute sound' && muteToggle.muted.iconOnVisible === false && muteToggle.muted.iconMutedVisible === true && muteToggle.muted.bodyMuted === true && muteToggle.muted.audioMuted === true && muteToggle.muted.stored === '1', `${viewport.name}: mute did not engage ${JSON.stringify(muteToggle)}`);
      assert(muteToggle.unmuted.pressed === 'false' && muteToggle.unmuted.label === 'Mute sound' && muteToggle.unmuted.iconOnVisible === true && muteToggle.unmuted.iconMutedVisible === false && muteToggle.unmuted.bodyMuted === false && muteToggle.unmuted.audioMuted === false && muteToggle.unmuted.stored === '0', `${viewport.name}: mute did not disengage ${JSON.stringify(muteToggle)}`);
      assert(initial.titleLayout.taglineToLegal >= 8, `${viewport.name}: title tagline overlaps legal ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.titleLayout.studioLabelText === 'Digital companion by', `${viewport.name}: title studio credit label missing ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.titleLayout.odgLogoSrc.includes('assets/brand/odg-logo-charcoal.png') && initial.titleLayout.odgLogoAlt === 'OneDayGames', `${viewport.name}: title ODG wordmark missing ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.titleLayout.odgRect.width >= (viewport.mobile ? 70 : 72) && initial.titleLayout.odgRect.height >= 26, `${viewport.name}: title ODG wordmark too small ${JSON.stringify(initial.titleLayout)}`);
      assert(Math.abs(initial.titleLayout.odgCenterOffset) <= 3, `${viewport.name}: title ODG wordmark is not centered ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.badgeRect === null, `${viewport.name}: beta badge should be removed from retail title ${JSON.stringify(initial.badgeRect)}`);
      if (viewport.mobile) {
        assert(initial.titleLayout.presenterToTitle >= 8, `${viewport.name}: mobile presenter overlaps Trash Dice logo ${JSON.stringify(initial.titleLayout)}`);
        assert(initial.titleLayout.startCardToTagline >= 8, `${viewport.name}: mobile tagline overlaps start card ${JSON.stringify(initial.titleLayout)}`);
        if (viewport.width <= 720) {
          assert(initial.titleLayout.presenterLogoWidth <= 125, `${viewport.name}: mobile presenter logo too large ${JSON.stringify(initial.titleLayout)}`);
        } else {
          const compactTabletLandscape = viewport.height <= 760;
          assert(initial.titleLayout.presenterLogoWidth <= (compactTabletLandscape ? 112 : 132), `${viewport.name}: tablet presenter logo too large ${JSON.stringify(initial.titleLayout)}`);
          assert(initial.titleLayout.presenterToTitle >= (compactTabletLandscape ? 8 : 28), `${viewport.name}: tablet presenter needs breathing room above Trash Dice logo ${JSON.stringify(initial.titleLayout)}`);
          assert(initial.titleLayout.titleToStartCard >= (compactTabletLandscape ? 16 : 28) && initial.titleLayout.titleToStartCard <= (compactTabletLandscape ? 96 : 115), `${viewport.name}: tablet title-to-start-card spacing is off ${JSON.stringify(initial.titleLayout)}`);
          assert(initial.titleLayout.startCanRect.width >= (compactTabletLandscape ? 96 : 120), `${viewport.name}: tablet title can should read as a scene prop ${JSON.stringify(initial.titleLayout)}`);
          if (compactTabletLandscape) {
            assert(initial.titleLayout.startCanRect.right >= 48 && initial.titleLayout.startCanRect.left <= viewport.width - 48, `${viewport.name}: landscape title can should stay visibly in the scene ${JSON.stringify(initial.titleLayout)}`);
          } else {
            assert(initial.titleLayout.startCanRect.left >= 0, `${viewport.name}: tablet title can should not be cut off ${JSON.stringify(initial.titleLayout)}`);
            assert(initial.titleLayout.startCanToCard >= -24 && initial.titleLayout.startCanToCard <= 36, `${viewport.name}: tablet title can should sit near the start card ${JSON.stringify(initial.titleLayout)}`);
          }
        }
      } else {
        assert(initial.titleLayout.presenterToTitle >= 8, `${viewport.name}: desktop presenter mark needs breathing room above Trash Dice logo ${JSON.stringify(initial.titleLayout)}`);
        assert(initial.titleLayout.titleToStartCard >= 16 && initial.titleLayout.titleToStartCard <= 76, `${viewport.name}: desktop title screen should read as one tight start cluster ${JSON.stringify(initial.titleLayout)}`);
        assert(initial.titleLayout.startCardRect.width >= 340, `${viewport.name}: desktop start card should carry enough visual weight ${JSON.stringify(initial.titleLayout)}`);
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
        const badge = document.querySelector('.milestone-badge');
        const rr = roll.getBoundingClientRect();
        const pr = panel.getBoundingClientRect();
        const br = p0Button.getBoundingClientRect();
        const or = outcomeControls.getBoundingClientRect();
        const qr = quitButton.getBoundingClientRect();
        const gr = badge ? badge.getBoundingClientRect() : null;
        return {
          rollVisible: rr.width > 44 && rr.height > 44 && rr.bottom <= window.innerHeight + 1 && rr.top >= -1,
          panelVisible: pr.width > 120 && pr.height > 48 && pr.bottom <= window.innerHeight + 1,
          p0ButtonVisible: getComputedStyle(p0Button).display !== 'none' && br.width > 32 && br.height > 24 && br.right <= window.innerWidth + 1 && br.top >= -1,
          outcomeButtonsVisible: getComputedStyle(outcomeControls).display !== 'none' && or.width > 32 && or.height > 22 && or.right <= window.innerWidth + 1 && or.top >= -1,
          quitButtonVisible: getComputedStyle(quitButton).display !== 'none' && qr.width >= 88 && qr.height >= 42 && qr.right <= window.innerWidth - 6 && qr.left >= 0 && qr.top >= -1 && qr.bottom <= window.innerHeight + 1,
          quitClearsRoll: qr.bottom <= rr.top - 4 || qr.left >= rr.right + 4 || qr.right <= rr.left - 4 || qr.top >= rr.bottom + 4,
          debugClearsQuit: (br.bottom <= qr.top - 4 || br.left >= qr.right + 4 || br.right <= qr.left - 4 || br.top >= qr.bottom + 4) &&
            (or.bottom <= qr.top - 4 || or.left >= qr.right + 4 || or.right <= qr.left - 4 || or.top >= qr.bottom + 4),
          debugLowerRight: br.left >= window.innerWidth * 0.62 && or.left >= window.innerWidth * 0.62 && br.top >= window.innerHeight * 0.48 && or.top >= window.innerHeight * 0.48,
          badgePresent: !!badge,
          bodyFits: document.body.scrollWidth <= window.innerWidth + 1,
          disabled: roll.disabled,
          rollRect: { top: rr.top, bottom: rr.bottom, left: rr.left, right: rr.right, width: rr.width, height: rr.height },
          panelRect: { top: pr.top, bottom: pr.bottom, left: pr.left, right: pr.right, width: pr.width, height: pr.height },
          p0ButtonRect: { top: br.top, bottom: br.bottom, left: br.left, right: br.right, width: br.width, height: br.height },
          outcomeButtonsRect: { top: or.top, bottom: or.bottom, left: or.left, right: or.right, width: or.width, height: or.height },
          quitButtonRect: { top: qr.top, bottom: qr.bottom, left: qr.left, right: qr.right, width: qr.width, height: qr.height },
          badgeRect: gr ? { top: gr.top, bottom: gr.bottom, left: gr.left, right: gr.right, width: gr.width, height: gr.height } : null,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          activeAnimationCount: document.getAnimations().filter(animation => animation.playState === 'running').length,
          heroLogoGlint: (() => {
            const frame = document.querySelector('#heroTitle .retail-logo-frame');
            const logo = document.querySelector('#heroTitle .title-logo');
            if (!frame || !logo) return null;
            const fr = frame.getBoundingClientRect();
            const lr = logo.getBoundingClientRect();
            return {
              animationName: getComputedStyle(frame, '::after').animationName,
              duplicateImageCount: document.querySelectorAll('#heroTitle .retail-logo-glint-img').length,
              frameWidth: fr.width,
              logoWidth: lr.width
            };
          })()
        };
      })()`);
      assert(activeLayout.rollVisible, `${viewport.name}: roll button not visible in viewport ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.panelVisible, `${viewport.name}: roll panel not visible in viewport ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.p0ButtonVisible, `${viewport.name}: P-0 button not visible in viewport ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.outcomeButtonsVisible, `${viewport.name}: outcome buttons not visible in viewport ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.quitButtonVisible, `${viewport.name}: quit button not visible or not large enough in active game ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.quitClearsRoll, `${viewport.name}: quit button overlaps roll/play action ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.debugClearsQuit, `${viewport.name}: debug controls overlap Done ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.debugLowerRight, `${viewport.name}: debug controls are not in the lower-right tool corner ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.badgePresent === false, `${viewport.name}: beta badge should stay absent in active retail game ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.bodyFits, `${viewport.name}: active game creates horizontal overflow ${JSON.stringify(activeLayout)}`);
      if (viewport.mobile && viewport.width > 720) {
        assert(activeLayout.heroLogoGlint && activeLayout.heroLogoGlint.animationName === 'none', `${viewport.name}: tablet active game logo glint should be paused for performance ${JSON.stringify(activeLayout)}`);
      } else {
        assert(activeLayout.heroLogoGlint && activeLayout.heroLogoGlint.animationName === 'retailLogoGlint', `${viewport.name}: active game logo glint animation missing ${JSON.stringify(activeLayout)}`);
      }
      assert(activeLayout.heroLogoGlint.duplicateImageCount === 0, `${viewport.name}: active game logo glint should not use duplicate logo bitmap ${JSON.stringify(activeLayout.heroLogoGlint)}`);
      assert(activeLayout.heroLogoGlint.frameWidth <= activeLayout.heroLogoGlint.logoWidth + 2, `${viewport.name}: active game logo glint frame should not span the page ${JSON.stringify(activeLayout.heroLogoGlint)}`);
      if (viewport.width <= 720) {
        assert(activeLayout.quitButtonRect.top <= 32 && activeLayout.quitButtonRect.left <= 24, `${viewport.name}: active mobile quit button should stay in top-left escape position ${JSON.stringify(activeLayout)}`);
      }
      assert(activeLayout.disabled === false, `${viewport.name}: roll button disabled after start`);
      if (viewport.mobile && viewport.width > 720) {
        assert(activeLayout.activeAnimationCount <= 3, `${viewport.name}: tablet game state has too many running animations ${JSON.stringify(activeLayout)}`);
      }

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
        bodyFits: document.body.scrollWidth <= window.innerWidth + 1,
        playAgain: (() => {
          const btn = document.getElementById('rollBtn');
          const r = btn.getBoundingClientRect();
          return {
            text: btn.textContent || '',
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            left: r.left,
            width: r.width,
            height: r.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            visible: r.width >= 88 && r.height >= 44 && r.left >= -1 && r.right <= window.innerWidth + 1 && r.top >= -1 && r.bottom <= window.innerHeight + 1
          };
        })(),
        winTitleCursor: (() => {
          const title = document.getElementById('inlineResultTitle');
          if (!title) return 'missing-title';
          const rect = title.getBoundingClientRect();
          const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return el ? getComputedStyle(el).cursor : 'missing-probe';
        })(),
        winLogoGlint: (() => {
          const frame = document.querySelector('#heroTitle .retail-logo-frame');
          const logo = document.querySelector('#heroTitle .title-logo');
          if (!frame || !logo) return null;
          const fr = frame.getBoundingClientRect();
          const lr = logo.getBoundingClientRect();
          return {
            animationName: getComputedStyle(frame, '::after').animationName,
            duplicateImageCount: document.querySelectorAll('#heroTitle .retail-logo-glint-img').length,
            frameWidth: fr.width,
            logoFilter: getComputedStyle(logo).filter,
            logoWidth: lr.width
          };
        })(),
        activeAnimationCount: document.getAnimations().filter(animation => animation.playState === 'running').length,
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
      assert(terminal.bodyFits, `${viewport.name}: win screen creates horizontal overflow ${JSON.stringify(terminal)}`);
      assert(terminal.playAgain.text.includes('PLAY AGAIN'), `${viewport.name}: Play Again CTA missing ${JSON.stringify(terminal)}`);
      assert(terminal.playAgain.visible, `${viewport.name}: Play Again is not fully visible or tappable ${JSON.stringify(terminal)}`);
      assert(terminal.winTitleCursor !== 'none', `${viewport.name}: cursor hidden over congratulations title ${JSON.stringify(terminal)}`);
      if (viewport.mobile && viewport.width > 720) {
        assert(terminal.winLogoGlint && terminal.winLogoGlint.animationName === 'none', `${viewport.name}: tablet win screen logo glint should be paused for performance ${JSON.stringify(terminal)}`);
      } else {
        assert(terminal.winLogoGlint && terminal.winLogoGlint.animationName === 'retailLogoGlint', `${viewport.name}: win screen logo glint animation missing ${JSON.stringify(terminal)}`);
      }
      assert(terminal.winLogoGlint.duplicateImageCount === 0, `${viewport.name}: win screen logo glint should not use duplicate logo bitmap ${JSON.stringify(terminal.winLogoGlint)}`);
      assert(terminal.winLogoGlint.frameWidth <= terminal.winLogoGlint.logoWidth + 2, `${viewport.name}: win screen logo glint frame should not span the page ${JSON.stringify(terminal.winLogoGlint)}`);
      assert(terminal.winLogoGlint.logoFilter === 'none', `${viewport.name}: win screen logo should not use bitmap filter during title fanfare ${JSON.stringify(terminal.winLogoGlint)}`);
      if (viewport.mobile && viewport.width > 720) {
        assert(terminal.activeAnimationCount <= 6, `${viewport.name}: tablet win state has too many running animations ${JSON.stringify(terminal)}`);
      }
      await sleep(1700);
      const terminalLoop = await evalValue(page, `(() => ({
        stillComplete: !!(window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active),
        titleFanfare: document.getElementById('heroTitle').classList.contains('round-win-title-fanfare') || document.getElementById('heroTitle').classList.contains('round-win-title-sustain'),
        winnerPanel: document.getElementById('p1Inventory').closest('.player-panel').classList.contains('player-payout-fanfare'),
        winnerLabel: (document.getElementById('p1StatusText') || {}).textContent || '',
        celebratingDice: document.querySelectorAll('#p1Pile .bench-cheer-die').length,
        activeAnimationCount: document.getAnimations().filter(animation => animation.playState === 'running').length
      }))()`);
      assert(terminalLoop.stillComplete, `${viewport.name}: game over cleared before Play Again ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.titleFanfare === true, `${viewport.name}: title fanfare did not persist ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.winnerPanel === true, `${viewport.name}: winner panel fanfare did not persist ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.winnerLabel === 'WINNER', `${viewport.name}: winner label did not persist ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.celebratingDice > 0, `${viewport.name}: dice celebration did not loop ${JSON.stringify(terminalLoop)}`);
      if (viewport.mobile && viewport.width > 720) {
        assert(terminalLoop.activeAnimationCount <= 5, `${viewport.name}: tablet sustained win state has too many running animations ${JSON.stringify(terminalLoop)}`);
      }
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

    const productionIpadViewport = viewports.find(viewport => viewport.name === 'ipad-portrait');
    const productionIpad = await openPage(`${productionLikeBaseUrl}?source=qa&qa-hooks=1`, productionIpadViewport);
    await waitEval(productionIpad, `!!window.TrashDiceQA && window.TrashDiceQA.state().qaHooks === true`, 'production-like iPad QA hooks');
    const productionIpadInitialStart = await evalValue(productionIpad, `(() => {
      const can = document.querySelector('.start-lurker-can');
      const rect = can ? can.getBoundingClientRect() : null;
      return {
        state: window.TrashDiceQA.state(),
        bodyClasses: document.body.className,
        canAnimationName: can ? getComputedStyle(can).animationName : '',
        canTransform: can ? getComputedStyle(can).transform : '',
        canLeft: rect ? rect.left : null,
        mouthAnimationName: getComputedStyle(document.querySelector('.start-can-mouth')).animationName,
        chompAnimationName: getComputedStyle(document.querySelector('.start-can-lid-chomp')).animationName,
        activeAnimationCount: document.getAnimations().filter(animation => animation.playState === 'running').length
      };
    })()`);
    await sleep(650);
    const productionIpadInitialEnd = await evalValue(productionIpad, `(() => {
      const can = document.querySelector('.start-lurker-can');
      const rect = can ? can.getBoundingClientRect() : null;
      return {
        canTransform: can ? getComputedStyle(can).transform : '',
        canLeft: rect ? rect.left : null
      };
    })()`);
    const productionIpadInitial = Object.assign({}, productionIpadInitialStart, {
      canFirstTransform: productionIpadInitialStart.canTransform,
      canSecondTransform: productionIpadInitialEnd.canTransform,
      canFirstLeft: productionIpadInitialStart.canLeft,
      canSecondLeft: productionIpadInitialEnd.canLeft
    });
    assert(productionIpadInitial.state.fastPreview === false, `production-like iPad should not use fast-preview ${JSON.stringify(productionIpadInitial)}`);
    assert(productionIpadInitial.state.tabletEffectsLite === true, `production-like iPad should use tablet effects lite ${JSON.stringify(productionIpadInitial)}`);
    assert(productionIpadInitial.state.iPadGameplayPerformanceMode === true, `production-like iPad performance mode missing ${JSON.stringify(productionIpadInitial)}`);
    assert(productionIpadInitial.state.legacyIpadPerformanceMode === false, `default production-like iPad probe should not force legacy mode ${JSON.stringify(productionIpadInitial)}`);
    assert(productionIpadInitial.canAnimationName === 'startCanLurkIpadSmooth', `production-like iPad title can should use compositor CSS body motion ${JSON.stringify(productionIpadInitial)}`);
    const productionIpadTitleCanTravel = Math.abs(productionIpadInitial.canSecondLeft - productionIpadInitial.canFirstLeft);
    assert(productionIpadTitleCanTravel >= 16, `production-like iPad title can body motion appears stopped ${JSON.stringify(productionIpadInitial)}`);
    assert(productionIpadTitleCanTravel <= 130, `production-like iPad title can body motion is too fast ${JSON.stringify(productionIpadInitial)}`);
    assert(productionIpadInitial.mouthAnimationName !== 'none' && productionIpadInitial.chompAnimationName !== 'none', `production-like iPad title can chomp should stay alive ${JSON.stringify(productionIpadInitial)}`);

    await evalValue(productionIpad, `document.getElementById('startBtn').click(); true`);
    await waitEval(productionIpad, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, 'production-like iPad game start');
    await sleep(400);
    const productionIpadActive = await evalValue(productionIpad, `(() => {
      const state = window.TrashDiceQA.state();
      return {
        state,
        activeAnimationCount: document.getAnimations().filter(animation => animation.playState === 'running').length,
        activeAnimations: document.getAnimations()
          .filter(animation => animation.playState === 'running')
          .map(animation => ({
            name: animation.animationName || '',
            target: animation.effect && animation.effect.target
              ? animation.effect.target.className || animation.effect.target.id || animation.effect.target.tagName
              : ''
          })),
        heroLogoGlint: getComputedStyle(document.querySelector('#heroTitle .retail-logo-frame'), '::after').animationName,
        canHeroGlint: getComputedStyle(document.querySelector('.can-hero-glint')).animationName,
        canRimGlint: getComputedStyle(document.querySelector('.can-rim-glint')).animationName,
        lidEdgeGlint: getComputedStyle(document.querySelector('.lid-edge-glint')).animationName,
        lidInnerGlint: getComputedStyle(document.querySelector('.lid-inner-glint')).animationName,
        lidIdle: getComputedStyle(document.getElementById('boardWrap')).animationName,
        canIdle: getComputedStyle(document.getElementById('trashCan')).animationName,
        canFilter: getComputedStyle(document.getElementById('trashCan')).filter,
        rollStageGlowFilter: getComputedStyle(document.querySelector('.roll-die-stage'), '::before').filter
      };
    })()`);
    assert(productionIpadActive.state.fastPreview === false, `production-like iPad active game should remain non-fast ${JSON.stringify(productionIpadActive)}`);
    assert(productionIpadActive.state.iPadGameplayPerformanceMode === true, `production-like iPad active performance mode dropped ${JSON.stringify(productionIpadActive)}`);
    assert(productionIpadActive.state.timings.rollAnimationMs >= 480 && productionIpadActive.state.timings.rollAnimationMs <= 560, `production-like iPad roll should be visible without returning to the full path ${JSON.stringify(productionIpadActive)}`);
    assert(productionIpadActive.state.timings.rollRevealHoldMs >= 100 && productionIpadActive.state.timings.rollRevealHoldMs <= 180, `production-like iPad reveal hold should be readable but short ${JSON.stringify(productionIpadActive)}`);
    assert(productionIpadActive.state.timings.rollTravelToSlotMs === 0 && productionIpadActive.state.timings.rollTravelToTrashMs === 0, `production-like iPad should bypass roll travel ${JSON.stringify(productionIpadActive)}`);
    assert(productionIpadActive.heroLogoGlint === 'retailLogoGlint', `production-like iPad active logo glint should stay alive ${JSON.stringify(productionIpadActive)}`);
    assert(productionIpadActive.canHeroGlint === 'canHeroGlintSweep' && productionIpadActive.canRimGlint === 'canRimGlintSweep', `production-like iPad active can glints should stay alive ${JSON.stringify(productionIpadActive)}`);
    assert(productionIpadActive.lidEdgeGlint === 'lidHeroGlint' && productionIpadActive.lidInnerGlint === 'lidInnerGlint', `production-like iPad active lid glints should stay alive ${JSON.stringify(productionIpadActive)}`);
    assert(productionIpadActive.lidIdle === 'lidIdleWobble' && productionIpadActive.canIdle === 'canIdleWobble', `production-like iPad active can/lid idle motion should stay alive ${JSON.stringify(productionIpadActive)}`);
    assert(productionIpadActive.canFilter === 'none', `production-like iPad can filter should be removed during gameplay ${JSON.stringify(productionIpadActive)}`);
    assert(productionIpadActive.activeAnimationCount <= 9, `production-like iPad active game has too many running animations ${JSON.stringify(productionIpadActive)}`);

    const productionIpadRollVisual = await evalValue(productionIpad, `new Promise(resolve => {
      window.TrashDiceQA.queueRolls([3]);
      document.getElementById('rollBtn').click();
      window.setTimeout(() => {
        const die = document.getElementById('p1Die');
        const stage = document.getElementById('p1DieStage');
        const rect = die.getBoundingClientRect();
        const style = getComputedStyle(die);
        resolve({
          className: die.className,
          stageClass: stage.className,
          visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.75 && rect.width >= 40 && rect.height >= 40,
          rect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top },
          animations: die.getAnimations().map(animation => animation.animationName || ''),
          message: document.getElementById('message').textContent.trim()
        });
      }, 180);
    })`);
    assert(productionIpadRollVisual.visible === true, `production-like iPad hero die is not visibly rolling ${JSON.stringify(productionIpadRollVisual)}`);
    assert(productionIpadRollVisual.className.includes('ipad-rolling') && productionIpadRollVisual.stageClass.includes('active'), `production-like iPad hero die roll class is missing ${JSON.stringify(productionIpadRollVisual)}`);

    const productionIpadHandoff = await evalValue(productionIpad, `window.TrashDiceQA.cpuHandoffProbe(2, 'place')`);
    assert(productionIpadHandoff.expectedHandoffMs <= 180, `production-like iPad CPU handoff constant is too slow ${JSON.stringify(productionIpadHandoff)}`);
    assert(productionIpadHandoff.totalMs <= 1300, `production-like iPad roll-to-ready path is too slow ${JSON.stringify(productionIpadHandoff)}`);
    reports.push({
      viewport: 'ipad-portrait-production-like',
      status: 'ok',
      timings: productionIpadActive.state.timings,
      rollVisual: productionIpadRollVisual,
      cpuHandoff: {
        totalMs: productionIpadHandoff.totalMs,
        handoffMs: productionIpadHandoff.handoffMs,
        expectedHandoffMs: productionIpadHandoff.expectedHandoffMs
      }
    });

    const modernIpadViewport = {
      ...productionIpadViewport,
      name: 'ipad-9-7-ios18',
      userAgent: IPAD_OS18_USER_AGENT,
      platform: 'iPad'
    };
    const modernIpad = await openPage(`${productionLikeBaseUrl}?source=qa&qa-hooks=1`, modernIpadViewport);
    await waitEval(modernIpad, `!!window.TrashDiceQA && window.TrashDiceQA.state().qaHooks === true`, 'modern iPad QA hooks');
    const modernIpadInitial = await evalValue(modernIpad, `(() => {
      const note = document.getElementById('legacyIpadGuidance');
      const rect = note ? note.getBoundingClientRect() : null;
      return {
        state: window.TrashDiceQA.state(),
        bodyClasses: document.body.className,
        deviceProfile: document.body.dataset.deviceProfile || '',
        guidance: note ? {
          visible: getComputedStyle(note).display !== 'none' && rect.width > 0 && rect.height > 0,
          rect: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height }
        } : null
      };
    })()`);
    assert(modernIpadInitial.state.deviceProfile.isIpad === true, `modern iPad detector should identify iPad ${JSON.stringify(modernIpadInitial)}`);
    assert(modernIpadInitial.state.deviceProfile.appleOsMajor === 18, `modern iPad detector should read iPadOS 18 ${JSON.stringify(modernIpadInitial)}`);
    assert(modernIpadInitial.state.deviceProfile.isNineSevenIpadSize === true, `modern iPad detector should keep 9.7-inch size signal ${JSON.stringify(modernIpadInitial)}`);
    assert(modernIpadInitial.state.iPadGameplayPerformanceMode === true, `modern iPad should keep iPad gameplay performance mode ${JSON.stringify(modernIpadInitial)}`);
    assert(modernIpadInitial.state.legacyIpadPerformanceMode === false, `modern iPad should not enter legacy mode ${JSON.stringify(modernIpadInitial)}`);
    assert(modernIpadInitial.deviceProfile === 'ipad' && !modernIpadInitial.bodyClasses.includes('legacy-ipad-performance'), `modern iPad should stay in standard iPad profile ${JSON.stringify(modernIpadInitial)}`);
    assert(modernIpadInitial.guidance && modernIpadInitial.guidance.visible === false, `modern iPad should not show legacy guidance ${JSON.stringify(modernIpadInitial)}`);

    const legacyIpadViewport = {
      ...productionIpadViewport,
      name: 'ipad-pro-9-7-ios16',
      userAgent: IPAD_OS16_USER_AGENT,
      platform: 'iPad'
    };
    const legacyIpad = await openPage(`${productionLikeBaseUrl}?source=qa&qa-hooks=1`, legacyIpadViewport);
    await waitEval(legacyIpad, `!!window.TrashDiceQA && window.TrashDiceQA.state().qaHooks === true`, 'legacy iPad QA hooks');
    const legacyIpadInitialStart = await evalValue(legacyIpad, `(() => {
      const can = document.querySelector('.start-lurker-can');
      const note = document.getElementById('legacyIpadGuidance');
      const rect = can ? can.getBoundingClientRect() : null;
      const noteRect = note ? note.getBoundingClientRect() : null;
      return {
        state: window.TrashDiceQA.state(),
        bodyClasses: document.body.className,
        deviceProfile: document.body.dataset.deviceProfile || '',
        canAnimationName: can ? getComputedStyle(can).animationName : '',
        canAnimationDuration: can ? getComputedStyle(can).animationDuration : '',
        canLeft: rect ? rect.left : null,
        guidance: note ? {
          text: note.textContent.trim(),
          visible: getComputedStyle(note).display !== 'none' && noteRect.width > 0 && noteRect.height > 0,
          rect: { top: noteRect.top, right: noteRect.right, bottom: noteRect.bottom, left: noteRect.left, width: noteRect.width, height: noteRect.height }
        } : null
      };
    })()`);
    await sleep(650);
    const legacyIpadInitialEnd = await evalValue(legacyIpad, `(() => {
      const can = document.querySelector('.start-lurker-can');
      const rect = can ? can.getBoundingClientRect() : null;
      return { canLeft: rect ? rect.left : null };
    })()`);
    const legacyIpadTitleCanTravel = Math.abs(legacyIpadInitialEnd.canLeft - legacyIpadInitialStart.canLeft);
    assert(legacyIpadInitialStart.state.deviceProfile.isIpad === true, `legacy iPad detector should identify iPad ${JSON.stringify(legacyIpadInitialStart)}`);
    assert(legacyIpadInitialStart.state.deviceProfile.appleOsMajor === 16, `legacy iPad detector should read iPadOS 16 ${JSON.stringify(legacyIpadInitialStart)}`);
    assert(legacyIpadInitialStart.state.deviceProfile.isNineSevenIpadSize === true, `legacy iPad detector should identify 9.7-inch size class ${JSON.stringify(legacyIpadInitialStart)}`);
    assert(legacyIpadInitialStart.state.legacyIpadPerformanceMode === true, `legacy iPad performance mode missing ${JSON.stringify(legacyIpadInitialStart)}`);
    assert(legacyIpadInitialStart.deviceProfile === 'legacy-ipad' && legacyIpadInitialStart.bodyClasses.includes('legacy-ipad-performance'), `legacy iPad body profile missing ${JSON.stringify(legacyIpadInitialStart)}`);
    assert(legacyIpadInitialStart.guidance && legacyIpadInitialStart.guidance.visible === true, `legacy iPad guidance should be visible ${JSON.stringify(legacyIpadInitialStart)}`);
    assert(legacyIpadInitialStart.guidance.text === 'For the smoothest experience, play on iPhone, desktop, or a newer iPad.', `legacy iPad guidance copy changed ${JSON.stringify(legacyIpadInitialStart.guidance)}`);
    assert(legacyIpadInitialStart.canAnimationName === 'startCanLurkIpadSmooth' && legacyIpadInitialStart.canAnimationDuration === '20s', `legacy iPad title can should use slower compositor motion ${JSON.stringify(legacyIpadInitialStart)}`);
    assert(legacyIpadTitleCanTravel >= 14 && legacyIpadTitleCanTravel <= 120, `legacy iPad title can motion should be smooth and not frantic ${JSON.stringify({ legacyIpadInitialStart, legacyIpadInitialEnd, legacyIpadTitleCanTravel })}`);

    await evalValue(legacyIpad, `document.getElementById('startBtn').click(); true`);
    await waitEval(legacyIpad, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, 'legacy iPad game start');
    await sleep(400);
    const legacyIpadActive = await evalValue(legacyIpad, `(() => {
      const state = window.TrashDiceQA.state();
      return {
        state,
        activeAnimationCount: document.getAnimations().filter(animation => animation.playState === 'running').length,
        heroLogoGlint: getComputedStyle(document.querySelector('#heroTitle .retail-logo-frame'), '::after').animationName,
        heroLogoGlintDuration: getComputedStyle(document.querySelector('#heroTitle .retail-logo-frame'), '::after').animationDuration,
        canHeroGlint: getComputedStyle(document.querySelector('.can-hero-glint')).animationName,
        canHeroGlintDuration: getComputedStyle(document.querySelector('.can-hero-glint')).animationDuration,
        lidEdgeGlint: getComputedStyle(document.querySelector('.lid-edge-glint')).animationName,
        lidEdgeGlintDuration: getComputedStyle(document.querySelector('.lid-edge-glint')).animationDuration,
        lidIdle: getComputedStyle(document.getElementById('boardWrap')).animationName,
        canIdle: getComputedStyle(document.getElementById('trashCan')).animationName,
        canFilter: getComputedStyle(document.getElementById('trashCan')).filter
      };
    })()`);
    assert(legacyIpadActive.state.timings.rollAnimationMs === 260 && legacyIpadActive.state.timings.rollRevealHoldMs === 80, `legacy iPad should use the stricter roll timings ${JSON.stringify(legacyIpadActive)}`);
    assert(legacyIpadActive.heroLogoGlint === 'retailLogoGlint' && legacyIpadActive.heroLogoGlintDuration === '10.8s', `legacy iPad logo glint should stay alive but slow ${JSON.stringify(legacyIpadActive)}`);
    assert(legacyIpadActive.canHeroGlint === 'canHeroGlintSweep' && legacyIpadActive.canHeroGlintDuration === '11.2s', `legacy iPad can glint should stay alive but slow ${JSON.stringify(legacyIpadActive)}`);
    assert(legacyIpadActive.lidEdgeGlint === 'lidHeroGlint' && legacyIpadActive.lidEdgeGlintDuration === '11s', `legacy iPad lid glint should stay alive but slow ${JSON.stringify(legacyIpadActive)}`);
    assert(legacyIpadActive.lidIdle === 'lidIdleWobbleLegacy' && legacyIpadActive.canIdle === 'canIdleWobbleLegacy', `legacy iPad should use tiny can/lid idle motion ${JSON.stringify(legacyIpadActive)}`);
    assert(legacyIpadActive.canFilter === 'none', `legacy iPad can filter should stay removed ${JSON.stringify(legacyIpadActive)}`);
    assert(legacyIpadActive.activeAnimationCount <= 9, `legacy iPad active game has too many running animations ${JSON.stringify(legacyIpadActive)}`);

    const legacyIpadRollVisual = await evalValue(legacyIpad, `new Promise(resolve => {
      window.TrashDiceQA.queueRolls([4]);
      document.getElementById('rollBtn').click();
      window.setTimeout(() => {
        const die = document.getElementById('p1Die');
        const stage = document.getElementById('p1DieStage');
        const rect = die.getBoundingClientRect();
        const style = getComputedStyle(die);
        resolve({
          className: die.className,
          stageClass: stage.className,
          visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.75 && rect.width >= 40 && rect.height >= 40,
          animations: die.getAnimations().map(animation => ({
            name: animation.animationName || '',
            duration: animation.effect && animation.effect.getTiming ? animation.effect.getTiming().duration : null
          }))
        });
      }, 120);
    })`);
    assert(legacyIpadRollVisual.visible === true, `legacy iPad hero die should remain visible during snap-roll ${JSON.stringify(legacyIpadRollVisual)}`);
    assert(legacyIpadRollVisual.className.includes('ipad-rolling') && legacyIpadRollVisual.animations.some(animation => animation.name === 'dieRollLegacyIpad'), `legacy iPad roll animation should use snap-roll profile ${JSON.stringify(legacyIpadRollVisual)}`);

    const legacyIpadHandoff = await evalValue(legacyIpad, `window.TrashDiceQA.cpuHandoffProbe(2, 'place')`);
    assert(legacyIpadHandoff.expectedHandoffMs <= 130, `legacy iPad CPU handoff constant is too slow ${JSON.stringify(legacyIpadHandoff)}`);
    assert(legacyIpadHandoff.totalMs <= 900, `legacy iPad roll-to-ready path is too slow ${JSON.stringify(legacyIpadHandoff)}`);
    reports.push({
      viewport: 'ipad-pro-9-7-ios16-production-like',
      status: 'ok',
      deviceProfile: legacyIpadActive.state.deviceProfile,
      timings: legacyIpadActive.state.timings,
      rollVisual: legacyIpadRollVisual,
      cpuHandoff: {
        totalMs: legacyIpadHandoff.totalMs,
        handoffMs: legacyIpadHandoff.handoffMs,
        expectedHandoffMs: legacyIpadHandoff.expectedHandoffMs
      }
    });

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

    const publicProbe = await openPage(`${productionLikeBaseUrl}?source=bigdiscoveries`, viewports[0]);
    await evalValue(publicProbe, `document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true`);
    const publicInitial = await evalValue(publicProbe, `(() => ({
      badgeText: (document.querySelector('.milestone-badge') || {}).textContent || '',
      betaWipCopyPresent: document.body.textContent.includes('BETA WIP') || document.body.textContent.includes('NOT LIVE'),
      debugControlsEnabled: document.body.classList.contains('debug-controls-enabled'),
      p0ButtonHidden: document.getElementById('devP0Btn') ? getComputedStyle(document.getElementById('devP0Btn')).display === 'none' : false,
      outcomeButtonsHidden: document.getElementById('debugOutcomeControls') ? getComputedStyle(document.getElementById('debugOutcomeControls')).display === 'none' : false,
      qaHooksPresent: !!window.TrashDiceQA,
      guidanceVisible: (() => {
        const note = document.getElementById('legacyIpadGuidance');
        if (!note) return false;
        const r = note.getBoundingClientRect();
        return getComputedStyle(note).display !== 'none' && r.width > 0 && r.height > 0;
      })()
    }))()`);
    assert(publicInitial.badgeText.trim() === '' && publicInitial.betaWipCopyPresent === false, `public probe: beta badge/copy should be absent ${JSON.stringify(publicInitial)}`);
    assert(publicInitial.debugControlsEnabled === false && publicInitial.p0ButtonHidden === true && publicInitial.outcomeButtonsHidden === true, `public probe: debug controls should be hidden before play ${JSON.stringify(publicInitial)}`);
    assert(publicInitial.qaHooksPresent === false, `public probe: QA hooks should not install without qa/qa-hooks ${JSON.stringify(publicInitial)}`);
    assert(publicInitial.guidanceVisible === false, `public probe: legacy guidance should not show on desktop ${JSON.stringify(publicInitial)}`);
    await evalValue(publicProbe, `document.getElementById('startBtn').click(); true`);
    await waitEval(publicProbe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, 'public probe game start');
    const publicActive = await evalValue(publicProbe, `(() => ({
      debugControlsEnabled: document.body.classList.contains('debug-controls-enabled'),
      p0ButtonHidden: document.getElementById('devP0Btn') ? getComputedStyle(document.getElementById('devP0Btn')).display === 'none' : false,
      outcomeButtonsHidden: document.getElementById('debugOutcomeControls') ? getComputedStyle(document.getElementById('debugOutcomeControls')).display === 'none' : false,
      gameStarted: document.body.dataset.gameStarted === 'true'
    }))()`);
    assert(publicActive.gameStarted === true, `public probe: game did not start ${JSON.stringify(publicActive)}`);
    assert(publicActive.debugControlsEnabled === false && publicActive.p0ButtonHidden === true && publicActive.outcomeButtonsHidden === true, `public probe: debug controls should stay hidden during public play ${JSON.stringify(publicActive)}`);

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
