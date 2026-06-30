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
const IPHONE_OS18_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const IPAD_OS16_USER_AGENT = 'Mozilla/5.0 (iPad; CPU OS 16_7_16 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const IPAD_OS18_USER_AGENT = 'Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const forbiddenRequests = [
  'manifest.webmanifest',
  'sw.js',
  'beta-ws',
  'trash-dice-beta-room',
  'quickchart.io'
];
const MATHEMATICAL_ELIMINATION_STATUS = 'NOT ENOUGH DICE TO COME BACK';

const viewports = [
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 },
  { name: 'iphone-se-visible', width: 375, height: 548, deviceScaleFactor: 2, mobile: true, screenWidth: 375, screenHeight: 667 },
  { name: 'iphone-13-safari', width: 390, height: 664, deviceScaleFactor: 3, mobile: true, screenWidth: 390, screenHeight: 844 },
  { name: 'ipad-portrait', width: 768, height: 920, deviceScaleFactor: 2, mobile: true, screenWidth: 768, screenHeight: 1024 }
];

const orientationLockedViewports = [
  { name: 'iphone-landscape-locked', width: 844, height: 390, deviceScaleFactor: 3, mobile: true, screenWidth: 390, screenHeight: 844, userAgent: IPHONE_OS18_USER_AGENT, platform: 'iPhone' },
  { name: 'ipad-landscape-locked', width: 1024, height: 690, deviceScaleFactor: 2, mobile: true, screenWidth: 1024, screenHeight: 768, userAgent: IPAD_OS18_USER_AGENT, platform: 'iPad' }
];

const desktopScrollViewports = [
  { name: 'desktop-short-1366x768-scroll', width: 1366, height: 768, deviceScaleFactor: 1, mobile: false, screenWidth: 1366, screenHeight: 768 },
  { name: 'desktop-short-1280x720-scroll', width: 1280, height: 720, deviceScaleFactor: 1, mobile: false, screenWidth: 1280, screenHeight: 720 }
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

function ipadRollVisualProbeScript(rollValue, maxMs = 960, intervalMs = 40) {
  return `new Promise(resolve => {
    const samples = [];
    let best = null;
    let firstActive = null;
    const startedAt = performance.now();
    const read = () => {
      const die = document.getElementById('p1Die');
      const stage = document.getElementById('p1DieStage');
      const dot = die.querySelector('.dot');
      const rect = die.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const dotRect = dot ? dot.getBoundingClientRect() : null;
      const style = getComputedStyle(die);
      const stageStyle = getComputedStyle(stage);
      const dotStyle = dot ? getComputedStyle(dot) : null;
      const state = window.TrashDiceQA.state();
      const visible = style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.75 && stageStyle.visibility !== 'hidden' && Number(stageStyle.opacity || 1) > 0.75 && rect.width >= 40 && rect.height >= 40;
      return {
        elapsed: Math.round(performance.now() - startedAt),
        state,
        bodyClasses: document.body.className,
        className: die.className,
        stageClass: stage.className,
        active: stage.classList.contains('active') && die.className.includes('rolling'),
        visible,
        rect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
        stageRect: { width: stageRect.width, height: stageRect.height, left: stageRect.left, top: stageRect.top, right: stageRect.right, bottom: stageRect.bottom },
        stageCssWidth: Number.parseFloat(stageStyle.width || '0'),
        dotRect: dotRect ? { width: dotRect.width, height: dotRect.height, left: dotRect.left, top: dotRect.top } : null,
        dotCssMaxWidth: dotStyle ? Number.parseFloat(dotStyle.maxWidth || '0') : 0,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        animations: die.getAnimations().map(animation => ({
          name: animation.animationName || '',
          duration: animation.effect && animation.effect.getTiming ? animation.effect.getTiming().duration : null
        })),
        message: (document.getElementById('message') || {}).textContent || ''
      };
    };
    const finish = sample => resolve({ ...sample, best, firstActive, samples });
    const tick = () => {
      const sample = read();
      samples.push(sample);
      if (!best || sample.rect.width > best.rect.width) best = sample;
      if (!firstActive && sample.active) firstActive = sample;
      if (sample.visible && sample.rect.width >= 300 && sample.stageClass.includes('active')) {
        finish(sample);
        return;
      }
      if (performance.now() - startedAt >= ${Number(maxMs) || 960}) {
        finish(best || sample);
        return;
      }
      window.setTimeout(tick, ${Number(intervalMs) || 40});
    };
    window.TrashDiceQA.queueRolls([${Number(rollValue) || 1}]);
    document.getElementById('rollBtn').click();
    tick();
  })`;
}

function rollHeroTravelVisualProbeScript(rollValue, maxMs = 1700, intervalMs = 32, rewardWins = 0) {
  return `new Promise(resolve => {
    const samples = [];
    let bestRoll = null;
    let firstActive = null;
    let firstTravel = null;
    let bestTravel = null;
    const startedAt = performance.now();
    const numberValue = value => Number.parseFloat(value || '0') || 0;
    const rectOf = el => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    const snapDie = (el, stage = null) => {
      if (!el) return null;
      const dot = el.querySelector('.dot');
      const style = getComputedStyle(el);
      const stageStyle = stage ? getComputedStyle(stage) : null;
      const dotStyle = dot ? getComputedStyle(dot) : null;
      const rect = rectOf(el);
      const dotRect = dot ? rectOf(dot) : null;
      return {
        className: el.className,
        motionClass: el.classList.contains('to-slot-physical') ? 'to-slot-physical' : (el.classList.contains('to-trash-physical') ? 'to-trash-physical' : ''),
        stageClass: stage ? stage.className : '',
        rewardSkinned: el.classList.contains('reward-skinned'),
        effect: el.dataset.rewardEffect || '',
        stageCssWidth: stageStyle ? numberValue(stageStyle.width) : 0,
        stageCssHeight: stageStyle ? numberValue(stageStyle.height) : 0,
        active: !!(stage && stage.classList.contains('active') && el.className.includes('rolling')),
        visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.45 && (!stageStyle || (stageStyle.visibility !== 'hidden' && Number(stageStyle.opacity || 1) > 0.45)) && rect.width >= 40 && rect.height >= 40,
        rect,
        dotRect,
        dotCssMaxWidth: dotStyle ? numberValue(dotStyle.maxWidth) : 0,
        dotCssMaxHeight: dotStyle ? numberValue(dotStyle.maxHeight) : 0,
        paddingTop: numberValue(style.paddingTop),
        transform: style.transform || '',
        animationName: style.animationName || '',
        animationDuration: style.animationDuration || '',
        animations: el.getAnimations().map(animation => ({
          name: animation.animationName || '',
          duration: animation.effect && animation.effect.getTiming ? animation.effect.getTiming().duration : null
        }))
      };
    };
    const read = () => {
      const die = document.getElementById('p1Die');
      const stage = document.getElementById('p1DieStage');
      const travel = document.querySelector('.travelling-die');
      return {
        elapsed: Math.round(performance.now() - startedAt),
        state: window.TrashDiceQA.state(),
        bodyClasses: document.body.className,
        roll: snapDie(die, stage),
        travel: snapDie(travel),
        message: (document.getElementById('message') || {}).textContent || ''
      };
    };
    const finish = () => {
      const travelSamples = samples.map(sample => sample.travel).filter(Boolean);
      const travelAnimationNames = Array.from(new Set(travelSamples.flatMap(sample => [sample.animationName].concat((sample.animations || []).map(animation => animation.name))).filter(Boolean)));
      resolve({
        bestRoll,
        firstActive,
        firstTravel,
        bestTravel,
        travelAnimationNames,
        travelSamples: travelSamples.slice(-12),
        samples: samples.slice(-12),
        state: window.TrashDiceQA.state()
      });
    };
    const tick = () => {
      const sample = read();
      samples.push(sample);
      if (sample.roll && (!bestRoll || sample.roll.rect.width > bestRoll.rect.width)) bestRoll = sample.roll;
      if (sample.roll && sample.roll.active && !firstActive) firstActive = sample.roll;
      if (sample.travel && sample.travel.visible) {
        if (!firstTravel) firstTravel = sample.travel;
        const sampleDot = sample.travel.dotRect ? sample.travel.dotRect.width : 0;
        const bestDot = bestTravel && bestTravel.dotRect ? bestTravel.dotRect.width : 0;
        if (!bestTravel || sampleDot > bestDot || (!bestTravel.motionClass && sample.travel.motionClass)) bestTravel = sample.travel;
      }
      if ((bestTravel && bestTravel.motionClass) || performance.now() - startedAt >= ${Number(maxMs) || 1700}) {
        finish();
        return;
      }
      window.setTimeout(tick, ${Number(intervalMs) || 32});
    };
    const rewardWins = ${Number(rewardWins) || 0};
    if (rewardWins > 0 && window.TrashDiceQA.rewardSkinFixture) window.TrashDiceQA.rewardSkinFixture(rewardWins);
    window.TrashDiceQA.queueRolls([${Number(rollValue) || 1}]);
    document.getElementById('rollBtn').click();
    tick();
  })`;
}

function desktopRollStartStabilityProbeScript(maxMs = 360, intervalMs = 24) {
  return `new Promise(resolve => {
    const board = document.getElementById('boardWrap');
    const stage = document.getElementById('p1DieStage');
    const rollBtn = document.getElementById('rollBtn');
    const rectOf = el => {
      const rect = el.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const boardIdleAnimation = () => board
      ? board.getAnimations().find(animation => animation.animationName === 'lidIdleReadyStable' || animation.animationName === 'lidIdleWobble')
      : null;
    const snap = label => {
      const boardStyle = board ? getComputedStyle(board) : null;
      const stageStyle = stage ? getComputedStyle(stage) : null;
      return {
        label,
        elapsed: 0,
        bodyReady: document.body.classList.contains('player-roll-ready'),
        boardRect: board ? rectOf(board) : null,
        boardTransform: boardStyle ? boardStyle.transform || '' : '',
        boardAnimationName: boardStyle ? boardStyle.animationName || '' : '',
        stageClass: stage ? stage.className : '',
        stageAnimationName: stageStyle ? stageStyle.animationName || '' : '',
        stageFilter: stageStyle ? stageStyle.filter || '' : ''
      };
    };
    const idle = boardIdleAnimation();
    if (idle && idle.effect && idle.effect.getTiming) {
      const timing = idle.effect.getTiming();
      if (Number.isFinite(Number(timing.duration)) && Number(timing.duration) > 0) {
        idle.currentTime = Number(timing.duration) * 0.62;
      }
    }
    const before = snap('before');
    const samples = [];
    const startedAt = performance.now();
    const tick = () => {
      const sample = snap('after');
      sample.elapsed = Math.round(performance.now() - startedAt);
      samples.push(sample);
      if (sample.elapsed >= ${Number(maxMs) || 360}) {
        const shifts = samples
          .filter(item => item.boardRect && before.boardRect)
          .map(item => Math.max(
            Math.abs(item.boardRect.left - before.boardRect.left),
            Math.abs(item.boardRect.top - before.boardRect.top),
            Math.abs(item.boardRect.width - before.boardRect.width),
            Math.abs(item.boardRect.height - before.boardRect.height)
          ));
        resolve({
          before,
          samples,
          maxBoardShiftPx: shifts.length ? Math.max(...shifts) : 0,
          stageFilters: Array.from(new Set(samples.map(item => item.stageFilter).filter(Boolean))),
          state: window.TrashDiceQA.state()
        });
        return;
      }
      window.setTimeout(tick, ${Number(intervalMs) || 24});
    };
    rollBtn.click();
    tick();
  })`;
}

function cosmicAmbientPerfProbeScript(sampleMs = 960) {
  return `new Promise(resolve => {
    const deltas = [];
    const startedAt = performance.now();
    let last = startedAt;
    const cosmicMotionSnapshot = () => {
      const cosmic = document.querySelector('.vip-cosmic-sky');
      if (!cosmic) return null;
      const style = getComputedStyle(cosmic);
      const before = getComputedStyle(cosmic, '::before');
      const after = getComputedStyle(cosmic, '::after');
      return {
        transform: style.transform || '',
        opacity: style.opacity || '',
        beforeOpacity: before.opacity || '',
        beforeAnimationName: before.animationName || '',
        afterOpacity: after.opacity || '',
        afterTransform: after.transform || '',
        afterAnimationName: after.animationName || ''
      };
    };
    const animationSummary = () => document.getAnimations()
      .filter(animation => animation.playState === 'running')
      .map(animation => ({
        name: animation.animationName || '',
        target: animation.effect && animation.effect.target
          ? animation.effect.target.id || animation.effect.target.className || animation.effect.target.tagName || ''
          : ''
      }));
    const activeAnimations = animationSummary();
    const motionStart = cosmicMotionSnapshot();
    const tick = now => {
      deltas.push(now - last);
      last = now;
      if (now - startedAt >= ${Number(sampleMs) || 960}) {
        const frames = deltas.slice(1);
        const sorted = frames.slice().sort((a, b) => a - b);
        const avg = frames.reduce((sum, value) => sum + value, 0) / Math.max(1, frames.length);
        const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
        const max = sorted[sorted.length - 1] || 0;
        const bodyAfter = getComputedStyle(document.body, '::after');
        const bodyBefore = getComputedStyle(document.body, '::before');
        const cosmic = document.querySelector('.vip-cosmic-sky');
        const cosmicStyle = cosmic ? getComputedStyle(cosmic) : null;
        const cosmicBefore = cosmic ? getComputedStyle(cosmic, '::before') : null;
        const cosmicAfter = cosmic ? getComputedStyle(cosmic, '::after') : null;
        const motionEnd = cosmicMotionSnapshot();
        const motionChanged = !!(motionStart && motionEnd) && (
          motionStart.transform !== motionEnd.transform ||
          motionStart.beforeOpacity !== motionEnd.beforeOpacity ||
          motionStart.afterTransform !== motionEnd.afterTransform ||
          motionStart.afterOpacity !== motionEnd.afterOpacity
        );
        const cosmicLayerAnimations = activeAnimations
          .filter(item => /^vip(?:Disco|Cosmic)/.test(item.name || ''));
        resolve({
          sampleMs: ${Number(sampleMs) || 960},
          frames: frames.length,
          avgFrameMs: Number(avg.toFixed(2)),
          p95FrameMs: Number(p95.toFixed(2)),
          maxFrameMs: Number(max.toFixed(2)),
          over34Frames: frames.filter(value => value > 34).length,
          over50Frames: frames.filter(value => value > 50).length,
          activeAnimationCount: activeAnimations.length,
          activeAnimations,
          cosmicLayerAnimationCount: cosmicLayerAnimations.length,
          cosmicLayerAnimations,
          overlayAnimationName: bodyAfter.animationName || '',
          overlayBlend: bodyAfter.mixBlendMode || '',
          overlayFilter: bodyAfter.filter || '',
          overlayGradientCount: (bodyAfter.backgroundImage.match(/gradient/g) || []).length,
          venueFilter: bodyBefore.filter || '',
          venueGradientCount: (bodyBefore.backgroundImage.match(/gradient/g) || []).length,
          bodyVip: document.body.classList.contains('vip-disco-party'),
          cosmicMotion: {
            changed: motionChanged,
            start: motionStart,
            end: motionEnd
          },
          cosmicSky: cosmicStyle ? {
            display: cosmicStyle.display || '',
            opacity: cosmicStyle.opacity || '',
            animationName: cosmicStyle.animationName || '',
            beforeAnimationName: cosmicBefore.animationName || '',
            afterAnimationName: cosmicAfter.animationName || ''
          } : null
        });
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })`;
}

function preShipPerfLeakProbeScript(options = {}) {
  const cycles = Math.max(1, Math.floor(Number(options.cycles) || 2));
  const sampleMs = Math.max(180, Math.floor(Number(options.sampleMs) || 320));
  const rollCleanSettleMs = Math.max(900, Math.floor(Number(options.rollCleanSettleMs) || 1250));
  const capWins = Math.max(1, Math.floor(Number(options.capWins) || 12));
  const prismWins = Math.max(1, Math.floor(Number(options.prismWins) || 9));
  return `(async () => {
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const waitUntil = async (predicate, timeout = 7000) => {
      const start = performance.now();
      while (performance.now() - start < timeout) {
        if (predicate()) return true;
        await sleep(40);
      }
      return false;
    };
    const generatedSelectors = [
      '.travelling-die',
      '.can-pour-die',
      '.lid-payout-die',
      '.payout-comet-trail',
      '.lid-place-burst',
      '.claim-badge',
      '.victory-cannon-die',
      '.victory-settled-die',
      '.victory-floor-die',
      '.victory-rain-die',
      '.victory-rain-die-lite',
      '.victory-jackpot-die',
      '.victory-dice-floor',
      '.victory-dice-rain',
      '.victory-can-jackpot',
      '.victory-screen-burst',
      '.victory-lid-backdrop',
      '.victory-lid-hero',
      '.victory-can-hero'
    ];
    const frameStats = sampleDurationMs => new Promise(resolve => {
      const deltas = [];
      const startedAt = performance.now();
      let last = startedAt;
      const tick = now => {
        deltas.push(now - last);
        last = now;
        if (now - startedAt >= sampleDurationMs) {
          const frames = deltas.slice(1);
          const sorted = frames.slice().sort((a, b) => a - b);
          const avg = frames.reduce((sum, value) => sum + value, 0) / Math.max(1, frames.length);
          resolve({
            frames: frames.length,
            avgFrameMs: Number(avg.toFixed(2)),
            p95FrameMs: Number((sorted[Math.floor(sorted.length * 0.95)] || 0).toFixed(2)),
            maxFrameMs: Number((sorted[sorted.length - 1] || 0).toFixed(2)),
            over34Frames: frames.filter(value => value > 34).length,
            over50Frames: frames.filter(value => value > 50).length
          });
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const generatedCounts = () => Object.fromEntries(generatedSelectors.map(selector => [selector, document.querySelectorAll(selector).length]));
    const totalGenerated = counts => Object.values(counts).reduce((sum, value) => sum + value, 0);
    const activeAnimationNames = () => document.getAnimations()
      .filter(animation => animation.playState === 'running')
      .map(animation => animation.animationName || '')
      .filter(Boolean);
    const snapshot = async label => {
      await sleep(140);
      const counts = generatedCounts();
      const state = window.TrashDiceQA.state();
      const animationNames = activeAnimationNames();
      return {
        label,
        nodeCount: document.getElementsByTagName('*').length,
        generatedTotal: totalGenerated(counts),
        generatedNonzero: Object.fromEntries(Object.entries(counts).filter(([, value]) => value > 0)),
        activeAnimationCount: animationNames.length,
        activeAnimationNames: Array.from(new Set(animationNames)).slice(0, 14),
        heapUsedKb: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024) : null,
        bodyVip: document.body.classList.contains('vip-disco-party'),
        inlineGameOver: !!(state.inlineGameOver && state.inlineGameOver.active),
        fastPreview: state.fastPreview,
        tabletEffectsLite: state.tabletEffectsLite,
        iPadGameplayPerformanceMode: state.iPadGameplayPerformanceMode,
        frameStats: await frameStats(${sampleMs})
      };
    };
    if (!window.TrashDiceQA || !window.TrashDiceDebug) return { error: 'qa hooks missing' };
    if (document.body.dataset.gameStarted !== 'true') {
      const startBtn = document.getElementById('startBtn');
      if (startBtn) startBtn.click();
      await waitUntil(() => document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled);
    }
    window.TrashDiceDebug.gameStart();
    await waitUntil(() => document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled && !window.TrashDiceQA.state().inlineGameOver);
    await sleep(180);
    const samples = [];
    samples.push(await snapshot('baseline'));
    window.TrashDiceQA.setRewardWins(${capWins});
    await waitUntil(() => document.body.classList.contains('vip-disco-party'), 2500);
    samples.push(await snapshot('cosmic'));
    for (let i = 0; i < ${cycles}; i++) {
      window.TrashDiceQA.gameWin('p1');
      await waitUntil(() => {
        const state = window.TrashDiceQA.state();
        return state.inlineGameOver && state.inlineGameOver.active;
      });
      samples.push(await snapshot('game-win-' + (i + 1)));
      window.TrashDiceDebug.gameStart();
      await waitUntil(() => document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled && !window.TrashDiceQA.state().inlineGameOver);
      samples.push(await snapshot('reset-after-win-' + (i + 1)));
      window.TrashDiceQA.setRewardWins(${prismWins});
      window.TrashDiceQA.queueRolls([(i % 6) + 1]);
      document.getElementById('rollBtn').click();
      await waitUntil(() => !document.getElementById('rollBtn').disabled && !document.querySelector('.travelling-die'));
      samples.push(await snapshot('prism-roll-settled-' + (i + 1)));
      await sleep(${rollCleanSettleMs});
      samples.push(await snapshot('prism-roll-clean-' + (i + 1)));
    }
    window.TrashDiceDebug.gameStart();
    window.TrashDiceQA.setRewardWins(0);
    await sleep(420);
    samples.push(await snapshot('final-clean'));
    const cleanSamples = samples.filter(sample => /baseline|cosmic|reset-after-win|prism-roll-clean|final-clean/.test(sample.label));
    const firstHeap = samples[0].heapUsedKb;
    const finalHeap = samples[samples.length - 1].heapUsedKb;
    return {
      version: document.body.dataset.trashDiceVersion,
      versionLabel: document.body.dataset.trashDiceVersionLabel,
      samples,
      summary: {
        cycles: ${cycles},
        nodeGrowth: samples[samples.length - 1].nodeCount - samples[0].nodeCount,
        maxGeneratedAfterClean: Math.max(...cleanSamples.map(sample => sample.generatedTotal)),
        finalGenerated: samples[samples.length - 1].generatedTotal,
        maxActiveAnimationCount: Math.max(...samples.map(sample => sample.activeAnimationCount)),
        finalActiveAnimationCount: samples[samples.length - 1].activeAnimationCount,
        maxSteadyP95FrameMs: Math.max(...cleanSamples.map(sample => sample.frameStats.p95FrameMs)),
        maxSteadyOver50Frames: Math.max(...cleanSamples.map(sample => sample.frameStats.over50Frames)),
        maxAnyOver50Frames: Math.max(...samples.map(sample => sample.frameStats.over50Frames)),
        firstHeapKb: firstHeap,
        finalHeapKb: finalHeap,
        heapGrowthKb: firstHeap === null || finalHeap === null ? null : finalHeap - firstHeap
      }
    };
  })()`;
}

function rewardHeroBodySpinProbeScript(totalWins, rollValue = 3, maxMs = 980, intervalMs = 40) {
  return `new Promise(resolve => {
    const samples = [];
    const startedAt = performance.now();
    const read = () => {
      const die = document.getElementById('p1Die');
      const stage = document.getElementById('p1DieStage');
      if (!die || !stage) return { elapsed: Math.round(performance.now() - startedAt), present: false };
      const style = getComputedStyle(die);
      const rect = die.getBoundingClientRect();
      const active = stage.classList.contains('active') && die.className.includes('rolling');
      const animations = die.getAnimations().map(animation => {
        const keyframes = animation.effect && animation.effect.getKeyframes ? animation.effect.getKeyframes() : [];
        return {
          name: animation.animationName || '',
          currentTime: Number(animation.currentTime || 0),
          duration: animation.effect && animation.effect.getTiming ? animation.effect.getTiming().duration : null,
          transforms: keyframes.map(keyframe => keyframe.transform || '').filter(Boolean)
        };
      });
      const rollAnimation = animations.find(animation => /^rewardDieRoll/.test(animation.name));
      return {
        elapsed: Math.round(performance.now() - startedAt),
        present: true,
        className: die.className,
        stageClass: stage.className,
        rewardSkinned: die.classList.contains('reward-skinned'),
        effect: die.dataset.rewardEffect || '',
        active,
        visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.55 && rect.width >= 40 && rect.height >= 40,
        transform: style.transform || '',
        animationName: style.animationName || '',
        animationDuration: style.animationDuration || '',
        animations,
        rollAnimationCurrentTime: rollAnimation ? rollAnimation.currentTime : null,
        rollKeyframeTransforms: rollAnimation ? rollAnimation.transforms : [],
        rect: { width: rect.width, height: rect.height }
      };
    };
    const finish = reason => {
      const activeSamples = samples.filter(sample => sample.active);
      const transformSamples = Array.from(new Set(activeSamples.map(sample => sample.transform).filter(transform => transform && transform !== 'none')));
      const animationNames = Array.from(new Set(activeSamples.flatMap(sample => [sample.animationName].concat(sample.animations.map(animation => animation.name))).filter(Boolean)));
      const rollAnimationTimeSamples = activeSamples.map(sample => Number(sample.rollAnimationCurrentTime || 0)).filter(value => Number.isFinite(value));
      const rollAnimationCurrentTimeDelta = rollAnimationTimeSamples.length
        ? Math.max(...rollAnimationTimeSamples) - Math.min(...rollAnimationTimeSamples)
        : 0;
      const rollKeyframeTransforms = Array.from(new Set(activeSamples.flatMap(sample => sample.rollKeyframeTransforms || []).filter(Boolean)));
      resolve({
        reason,
        activeSamples: activeSamples.length,
        visibleSamples: samples.filter(sample => sample.visible).length,
        uniqueTransformCount: transformSamples.length,
        transformSamples: transformSamples.slice(0, 8),
        animationNames,
        rollAnimationCurrentTimeDelta,
        rollKeyframeTransformCount: rollKeyframeTransforms.length,
        rollKeyframeTransforms: rollKeyframeTransforms.slice(0, 8),
        firstActive: activeSamples[0] || null,
        lastActive: activeSamples[activeSamples.length - 1] || null,
        samples: samples.slice(-12),
        state: window.TrashDiceQA.state()
      });
    };
    const tick = () => {
      const sample = read();
      samples.push(sample);
      const activeTransforms = Array.from(new Set(samples.filter(item => item.active).map(item => item.transform).filter(transform => transform && transform !== 'none')));
      const activeRollTimes = samples.filter(item => item.active).map(item => Number(item.rollAnimationCurrentTime || 0)).filter(value => Number.isFinite(value));
      const rollTimeDelta = activeRollTimes.length ? Math.max(...activeRollTimes) - Math.min(...activeRollTimes) : 0;
      if ((activeTransforms.length >= 2 || rollTimeDelta >= 80) && performance.now() - startedAt >= 80) {
        finish('body-transform-changed');
        return;
      }
      if (performance.now() - startedAt >= ${Number(maxMs) || 980}) {
        finish('timeout');
        return;
      }
      window.setTimeout(tick, ${Number(intervalMs) || 40});
    };
    window.TrashDiceQA.rewardSkinFixture(${Number(totalWins) || 9});
    window.TrashDiceQA.queueRolls([${Number(rollValue) || 3}]);
    document.getElementById('rollBtn').click();
    tick();
  })`;
}

const REWARD_BASE_NAMES = ['FEATHERS', 'TOXIC', 'BUBBLEGUM', 'ZAP', 'TIE-DYE', 'SUNRISE', 'DIAMOND', 'PRISM', 'CAMO', 'LAVA', 'DISCO'];
const REWARD_SPECIAL_NAMES = ['LETHAL CHICKEN', 'BIG DISCOVERIES'];
const REWARD_MILESTONES = '1|2|3|4|5|6|7|9|10|11|12';
const EXPECTED_TRASH_DICE_VERSION = 'td-retail-dev-20260630.2';
const EXPECTED_TRASH_DICE_VERSION_LABEL = 'TD Retail DEV 20260630.2';
const TRASH_DICE_VERSION_PATTERN = /^(td-retail-dev-\d{8}\.\d+|td-retail-live-\d+\.\d+\.\d+\+\d{8}\.\d+)$/;
const GAME_WIN_ROUND_WINS_FIRST_TICK_DELAY_MIN_MS = { desktop: 1400, mobile: 1600 };
const GAME_WIN_ROUND_WINS_TICK_MIN_MS = { desktop: 72, mobile: 84 };
const HERO_ROLL_VISUAL_EXPECTATIONS = {
  desktop: { stageMin: 360, stageMax: 390, dotCssMin: 56 },
  'iphone-se-visible': { stageMin: 178, stageMax: 195, dotCssMin: 24 },
  'iphone-13-safari': { stageMin: 178, stageMax: 195, dotCssMin: 24 }
};
const REWARD_EFFECTS_BY_NAME = {
  'FEATHERS': 'featherRipple',
  'TOXIC': 'toxicSpat',
  'BUBBLEGUM': 'bubblePop',
  'ZAP': 'bolt',
  'TIE-DYE': 'tieDye',
  'SUNRISE': 'sunrise',
  'DIAMOND': 'diamond',
  'PRISM': 'colorCycle',
  'CAMO': 'camo',
  'LAVA': 'lava',
  'DISCO': 'discoBall',
  'LETHAL CHICKEN': 'lethalChicken',
  'BIG DISCOVERIES': 'bigCompass'
};
const REWARD_SLOT_ANIMATION_BY_EFFECT = {
  featherRipple: 'slotRewardFeatherRipple',
  toxicSpat: 'slotRewardToxicOoze',
  bolt: 'slotRewardBoltZap',
  bubblePop: 'slotRewardBubblePop',
  tieDye: 'slotRewardTieDyeDrift',
  sunrise: 'slotRewardSunrise',
  shineSweep: 'slotRewardShineSweep',
  diamond: 'slotRewardDiamondSparkle',
  colorCycle: 'slotRewardPrismCycle',
  camo: 'slotRewardCamoDrift',
  lava: 'slotRewardLavaGlow',
  discoBall: 'slotRewardDiscoMirror',
  bigCompass: 'slotRewardCompassSpin',
  lethalChicken: 'slotRewardChickenHop'
};
const REWARD_OUTLINED_BASE_NAMES = ['FEATHERS', 'TIE-DYE', 'DIAMOND', 'PRISM', 'CAMO', 'LAVA'];

function rewardAtWins(config, wins) {
  return config.reduce((active, item) => wins >= item.minWins ? item : active, null);
}

function nextRewardAtWins(config, wins) {
  return config.find(item => wins < item.minWins) || null;
}

function rewardAtMinWins(config, minWins) {
  return config.find(item => item.minWins === minWins);
}

function rewardSlotAnimation(effect) {
  return REWARD_SLOT_ANIMATION_BY_EFFECT[effect] || '';
}

function hasNonZeroAnimationDuration(slot) {
  return (slot.animationDurations || []).some(value =>
    String(value || '').split(',').some(part => parseFloat(part) > 0)
  );
}

function hasVisibleSeatedRewardAnimation(item) {
  const slot = item.playerSlot || item;
  return !!slot &&
    slot.rewardSkinned === true &&
    Array.isArray(slot.animationNames) &&
    slot.animationNames.includes(rewardSlotAnimation(item.activeEffect || slot.effect)) &&
    Number(slot.animatedElementCount || 0) >= 2 &&
    hasNonZeroAnimationDuration(slot);
}

function assertPreShipPerfLeakProbe(label, result) {
  assert(result && !result.error, `${label}: pre-ship perf/leak probe did not run ${JSON.stringify(result)}`);
  const summary = result.summary || {};
  const steadyFrameLimit = Math.max(2, Math.ceil(Number(summary.cycles || 1) * 1.5));
  assert(summary.finalGenerated === 0 && summary.maxGeneratedAfterClean === 0, `${label}: generated visual nodes leaked after cleanup ${JSON.stringify(result)}`);
  assert(summary.nodeGrowth >= -4 && summary.nodeGrowth <= 48, `${label}: DOM node count drifted during repeated pre-ship cycles ${JSON.stringify(result)}`);
  assert(summary.finalActiveAnimationCount <= 16, `${label}: steady-state animation count stayed too high after cleanup ${JSON.stringify(result)}`);
  assert(summary.maxSteadyP95FrameMs <= 55 && summary.maxSteadyOver50Frames <= steadyFrameLimit, `${label}: steady-state frame pacing regressed in pre-ship probe ${JSON.stringify({ summary, steadyFrameLimit, samples: result.samples })}`);
  if (summary.heapGrowthKb !== null && Number.isFinite(summary.heapGrowthKb)) {
    assert(summary.heapGrowthKb <= 8192, `${label}: JS heap grew too much during repeated pre-ship cycles ${JSON.stringify(result)}`);
  }
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
    let rewardConfig = null;
    let rewardConfigNames = [];
    let rewardPairCount = 0;
    let rewardPairNames = [];
    let rewardFirst = null;
    let rewardSecond = null;
    let rewardCapDie = null;
    let rewardAtTwo = null;
    let rewardNextAfterTwo = null;
    let rewardAtSix = null;
    let rewardNextAfterSix = null;
    let rewardAtEleven = null;
    let rewardNextAfterEleven = null;
    let rewardPrism = null;

    for (const viewport of orientationLockedViewports) {
      const page = await openPage(`${baseUrl}?source=qa&qa=1`, viewport);
      await evalValue(page, `document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true`);
      await waitEval(page, `document.body.dataset.orientationBlocked === 'true'`, `${viewport.name} portrait gate`);
      const orientationGate = await evalValue(page, `(() => {
        const gate = document.getElementById('orientationLockScreen');
        const card = gate ? gate.querySelector('.orientation-lock-card') : null;
        const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        const gateRect = gate ? gate.getBoundingClientRect() : null;
        const cardRect = card ? card.getBoundingClientRect() : null;
        return {
          state: window.TrashDiceQA ? window.TrashDiceQA.state() : null,
          bodyBlocked: document.body.classList.contains('orientation-blocked'),
          datasetBlocked: document.body.dataset.orientationBlocked,
          hidden: gate ? gate.hidden : true,
          ariaHidden: gate ? gate.getAttribute('aria-hidden') : '',
          text: gate ? gate.textContent.replace(/\\s+/g, ' ').trim() : '',
          centerCovered: !!(centerEl && centerEl.closest && centerEl.closest('#orientationLockScreen')),
          bodyFits: document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1,
          gameStarted: document.body.dataset.gameStarted === 'true',
          gateRect: gateRect ? { top: gateRect.top, right: gateRect.right, bottom: gateRect.bottom, left: gateRect.left, width: gateRect.width, height: gateRect.height } : null,
          cardRect: cardRect ? { top: cardRect.top, right: cardRect.right, bottom: cardRect.bottom, left: cardRect.left, width: cardRect.width, height: cardRect.height } : null
        };
      })()`);
      assert(orientationGate.state && orientationGate.state.orientationBlocked === true, `${viewport.name}: QA state did not report orientation block ${JSON.stringify(orientationGate)}`);
      assert(orientationGate.bodyBlocked === true && orientationGate.datasetBlocked === 'true', `${viewport.name}: body orientation blocked state missing ${JSON.stringify(orientationGate)}`);
      assert(orientationGate.hidden === false && orientationGate.ariaHidden === 'false', `${viewport.name}: rotate overlay should be visible ${JSON.stringify(orientationGate)}`);
      assert(orientationGate.text.includes('ROTATE TO PORTRAIT') && orientationGate.text.includes('vertical play'), `${viewport.name}: rotate overlay copy changed ${JSON.stringify(orientationGate)}`);
      assert(orientationGate.centerCovered === true, `${viewport.name}: rotate overlay does not cover central touch target ${JSON.stringify(orientationGate)}`);
      assert(orientationGate.bodyFits === true, `${viewport.name}: rotate overlay creates horizontal overflow ${JSON.stringify(orientationGate)}`);
      assert(orientationGate.cardRect && orientationGate.cardRect.width <= viewport.width - 16 && orientationGate.cardRect.height <= viewport.height - 16, `${viewport.name}: rotate overlay card does not fit landscape viewport ${JSON.stringify(orientationGate)}`);
      await evalValue(page, `(() => {
        const target = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        if (target && typeof target.click === 'function') target.click();
        return true;
      })()`);
      const blockedAfterTap = await evalValue(page, `(() => ({
        blocked: document.body.dataset.orientationBlocked,
        gameStarted: document.body.dataset.gameStarted === 'true',
        centerCovered: !!document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2).closest('#orientationLockScreen')
      }))()`);
      assert(blockedAfterTap.blocked === 'true' && blockedAfterTap.gameStarted === false && blockedAfterTap.centerCovered === true, `${viewport.name}: rotated tap should stay blocked ${JSON.stringify(blockedAfterTap)}`);
      reports.push({ viewport: viewport.name, status: 'orientation-locked', state: orientationGate.state.orientationViewport });
    }

    for (const viewport of desktopScrollViewports) {
      const page = await openPage(`${baseUrl}?source=qa&qa=1`, viewport);
      await evalValue(page, `document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true`);
      await evalValue(page, `window.TrashDiceQA.setCompletedGames(0); window.TrashDiceQA.setRewardWins(0); true`);
      await evalValue(page, `document.getElementById('startBtn').click(); true`);
      await waitEval(page, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, `${viewport.name} game start`);
      await evalValue(page, `window.TrashDiceQA.gameWin('p2'); true`);
      await waitEval(page, `window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active`, `${viewport.name} game loss complete`);
      await sleep(760);
      const shortBeforeScroll = await evalValue(page, `(() => {
        const btn = document.getElementById('rollBtn');
        const r = btn.getBoundingClientRect();
        return {
          bodyOverflowX: getComputedStyle(document.body).overflowX,
          bodyOverflowY: getComputedStyle(document.body).overflowY,
          htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
          scrollTop: Math.round(document.body.scrollTop || document.documentElement.scrollTop || 0),
          bodyScrollHeight: document.body.scrollHeight,
          docScrollHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
          horizontalFits: document.body.scrollWidth <= window.innerWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth + 1,
          playAgain: { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), visible: r.top >= -1 && r.bottom <= window.innerHeight + 1, text: btn.textContent || '' }
        };
      })()`);
      assert(shortBeforeScroll.bodyOverflowX === 'hidden' && ['auto', 'scroll'].includes(shortBeforeScroll.bodyOverflowY), `${viewport.name}: desktop short viewport should allow stable vertical-only overflow ${JSON.stringify(shortBeforeScroll)}`);
      assert(shortBeforeScroll.htmlOverflowY === 'hidden', `${viewport.name}: document root should not create a second vertical scroll surface ${JSON.stringify(shortBeforeScroll)}`);
      assert(shortBeforeScroll.horizontalFits === true, `${viewport.name}: desktop short viewport should not create horizontal overflow ${JSON.stringify(shortBeforeScroll)}`);
      assert(shortBeforeScroll.playAgain.text.includes('KEEP PLAYING!'), `${viewport.name}: short viewport Keep Playing CTA missing ${JSON.stringify(shortBeforeScroll)}`);
      let shortAfterScroll = { scrollTop: shortBeforeScroll.scrollTop, playAgain: shortBeforeScroll.playAgain };
      if (shortBeforeScroll.bodyScrollHeight > shortBeforeScroll.viewportHeight + 1) {
        await evalValue(page, `document.body.scrollTo(0, document.body.scrollHeight); true`);
        await sleep(160);
        shortAfterScroll = await evalValue(page, `(() => {
          const btn = document.getElementById('rollBtn');
          const r = btn.getBoundingClientRect();
          return {
            scrollTop: Math.round(document.body.scrollTop || document.documentElement.scrollTop || 0),
            playAgain: { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), visible: r.top >= -1 && r.bottom <= window.innerHeight + 1, text: btn.textContent || '' }
          };
        })()`);
        assert(shortAfterScroll.scrollTop > 0, `${viewport.name}: short desktop viewport did not scroll vertically ${JSON.stringify({ shortBeforeScroll, shortAfterScroll })}`);
        assert(shortAfterScroll.playAgain.visible === true, `${viewport.name}: Play Again should be reachable after desktop short-viewport scroll ${JSON.stringify({ shortBeforeScroll, shortAfterScroll })}`);
      } else {
        assert(shortBeforeScroll.playAgain.visible === true, `${viewport.name}: Play Again should be visible without scroll when docked reward UI fits ${JSON.stringify(shortBeforeScroll)}`);
      }
      await evalValue(page, `document.getElementById('rollBtn').click(); true`);
      await waitEval(page, `!window.TrashDiceQA.state().inlineGameOver && document.body.dataset.gameStarted === 'true'`, `${viewport.name} restart after short-scroll Play Again`);
      const shortRestart = await evalValue(page, `(() => ({
        scrollTop: Math.round(document.body.scrollTop || document.documentElement.scrollTop || 0),
        rollText: (document.getElementById('rollBtn') || {}).textContent || '',
        inlineGameOver: !!(window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active)
      }))()`);
      assert(shortRestart.scrollTop <= 1 && shortRestart.inlineGameOver === false && shortRestart.rollText.includes('ROLL'), `${viewport.name}: restart should reset desktop scroll and leave game playable ${JSON.stringify(shortRestart)}`);
      reports.push({ viewport: viewport.name, status: 'desktop-scroll-ok', before: shortBeforeScroll.playAgain, after: shortAfterScroll.playAgain });
    }

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
        p1AutoButton: !!document.getElementById('devP1AutoBtn'),
        p1AutoButtonHidden: document.getElementById('devP1AutoBtn') ? getComputedStyle(document.getElementById('devP1AutoBtn')).display === 'none' : false,
        p1AutoButtonText: document.getElementById('devP1AutoBtn') ? document.getElementById('devP1AutoBtn').textContent.trim() : '',
        p1AutoButtonAudienceClass: document.getElementById('devP1AutoBtn') ? document.getElementById('devP1AutoBtn').classList.contains('auto-play-btn') : false,
        rewardReviewButton: !!document.getElementById('devRewardDieBtn'),
        rewardReviewButtonHidden: document.getElementById('devRewardDieBtn') ? getComputedStyle(document.getElementById('devRewardDieBtn')).display === 'none' : false,
        discoButton: !!document.getElementById('devDiscoBtn'),
        discoButtonHidden: document.getElementById('devDiscoBtn') ? getComputedStyle(document.getElementById('devDiscoBtn')).display === 'none' : false,
        cosmicSkyHidden: document.querySelector('.vip-cosmic-sky') ? getComputedStyle(document.querySelector('.vip-cosmic-sky')).display === 'none' : false,
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
        ipadTitleCanHidden: document.body.classList.contains('ipad-title-can-hidden'),
        version: document.body.dataset.trashDiceVersion || '',
        versionLabel: document.body.dataset.trashDiceVersionLabel || '',
        orientationLock: (() => {
          const gate = document.getElementById('orientationLockScreen');
          return {
            bodyBlocked: document.body.classList.contains('orientation-blocked'),
            datasetBlocked: document.body.dataset.orientationBlocked || '',
            hidden: gate ? gate.hidden : true,
            ariaHidden: gate ? gate.getAttribute('aria-hidden') : ''
          };
        })(),
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
        titleHeroDice: (() => {
          const dice = Array.from(document.querySelectorAll('.start-dice-row .start-die'));
          return {
            count: dice.length,
            classNames: dice.map(el => el.className),
            rewardNames: dice.map(el => el.dataset.rewardName || ''),
            rewardEffects: dice.map(el => el.dataset.rewardEffect || ''),
            rewardSkinned: dice.map(el => el.classList.contains('reward-skinned')),
            usesRewardDieComponent: dice.map(el => !!el.querySelector('.reward-die.title-reward-die')),
            dotCells: dice.map(el => el.querySelectorAll('.dot-cell, .reward-die-pip-cell').length),
            dots: dice.map(el => el.querySelectorAll('.dot, .reward-die-pip-cell.is-on .reward-die-pip').length),
            state: window.TrashDiceQA.titleHeroDiceState()
          };
        })(),
        titleLayout: (() => {
          const presenterLogo = document.querySelector('.title-presenter-logo');
          const presenterSub = document.querySelector('.title-presenter-sub');
          const titleLogo = document.querySelector('.start-overlay .title-wrap.big .title-logo');
          const legal = document.querySelector('.title-legal');
          const copyright = document.querySelector('.title-copyright');
          const studioLabel = document.querySelector('.title-studio-label');
          const odgLogo = document.querySelector('.title-odg-wordmark');
          const buildVersion = document.getElementById('titleBuildVersion');
          const startCan = document.querySelector('.start-lurker-can');
          const rect = el => {
            const r = el.getBoundingClientRect();
            return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
          };
          const overlaps = (a, b) => !!(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
          const presenterRect = rect(presenterLogo);
          const presenterSubRect = rect(presenterSub);
          const titleRect = rect(titleLogo);
          const startCard = document.querySelector('.start-blob-wrap');
          const startCardRect = rect(startCard);
          const startCanRect = rect(startCan);
          const legalRect = rect(legal);
          const copyrightRect = rect(copyright);
          const studioLabelRect = rect(studioLabel);
          const odgRect = rect(odgLogo);
          const copyrightStyle = getComputedStyle(copyright);
          const buildVersionRect = buildVersion ? rect(buildVersion) : null;
          const buildVersionStyle = buildVersion ? getComputedStyle(buildVersion) : null;
          const startCanStyle = getComputedStyle(startCan);
          return {
            presenterLogoWidth: presenterRect.width,
            presenterSubHeight: presenterSubRect.height,
            presenterLogoToTitle: titleRect.top - presenterRect.bottom,
            presenterToTitle: titleRect.top - presenterSubRect.bottom,
            titleToStartCard: startCardRect.top - titleRect.bottom,
            startCanToCard: startCardRect.left - startCanRect.right,
            startCardToLegal: legalRect.top - startCardRect.bottom,
            copyrightToStudio: studioLabelRect.top - copyrightRect.bottom,
            studioToOdg: odgRect.top - studioLabelRect.bottom,
            copyrightText: copyright ? copyright.textContent.trim() : '',
            copyrightWhiteSpace: copyrightStyle.whiteSpace,
            copyrightFitsViewport: copyrightRect.left >= -1 && copyrightRect.right <= window.innerWidth + 1,
            buildVersionText: buildVersion ? buildVersion.textContent.trim() : '',
            buildVersionWhiteSpace: buildVersionStyle ? buildVersionStyle.whiteSpace : '',
            buildVersionFitsViewport: buildVersionRect ? buildVersionRect.left >= -1 && buildVersionRect.right <= window.innerWidth + 1 && buildVersionRect.top >= -1 && buildVersionRect.bottom <= window.innerHeight + 1 : false,
            buildVersionLowerLeft: buildVersionRect ? buildVersionRect.left <= Math.max(24, window.innerWidth * 0.08) && buildVersionRect.top >= window.innerHeight * 0.62 : false,
            buildVersionClearLegal: !overlaps(buildVersionRect, legalRect),
            buildVersionClearStartCard: !overlaps(buildVersionRect, startCardRect),
            buildVersionBelowStartCard: buildVersionRect ? buildVersionRect.top >= startCardRect.bottom + Math.max(10, window.innerHeight * 0.018) : false,
            titleTaglinePresent: !!document.querySelector('.start-overlay .start-tagline'),
            studioLabelText: studioLabel ? studioLabel.textContent.trim() : '',
            studioLabelColor: studioLabel ? getComputedStyle(studioLabel).color : '',
            odgLogoSrc: odgLogo ? odgLogo.getAttribute('src') : '',
            odgLogoAlt: odgLogo ? odgLogo.getAttribute('alt') : '',
            odgCenterOffset: odgRect.left + odgRect.width / 2 - window.innerWidth / 2,
            startCanDisplay: startCanStyle.display,
            startCanAnimation: startCanStyle.animationName,
            startCanVisible: startCanStyle.display !== 'none' && startCanStyle.visibility !== 'hidden' && Number(startCanStyle.opacity || 1) > 0.01 && startCanRect.width > 0 && startCanRect.height > 0,
            presenterRect,
            presenterSubRect,
            titleRect,
            startCardRect,
            startCanRect,
            legalRect,
            buildVersionRect,
            copyrightRect,
            studioLabelRect,
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
      assert(initial.p1AutoButton === true, `${viewport.name}: AUTO button missing`);
      assert(initial.p1AutoButtonHidden === true, `${viewport.name}: AUTO button should hide on title screen`);
      assert(initial.p1AutoButtonText === 'AUTO' && initial.p1AutoButtonAudienceClass === true, `${viewport.name}: AUTO button should ship as audience-facing copy/class ${JSON.stringify(initial)}`);
      assert(initial.rewardReviewButton === true, `${viewport.name}: reward review button missing`);
      assert(initial.rewardReviewButtonHidden === true, `${viewport.name}: reward review button should hide on title screen`);
      assert(initial.discoButton === true, `${viewport.name}: DISCO debug button missing`);
      assert(initial.discoButtonHidden === true, `${viewport.name}: DISCO debug button should hide on title screen`);
      assert(initial.cosmicSkyHidden === true, `${viewport.name}: VIP cosmic ambience should stay hidden on title screen`);
      assert(initial.winButton === true, `${viewport.name}: win debug button missing`);
      assert(initial.loseButton === true, `${viewport.name}: lose debug button missing`);
      assert(initial.outcomeButtonsHidden === true, `${viewport.name}: outcome debug buttons should hide on title screen`);
      assert(initial.titleHeroDice.count === 2 && initial.titleHeroDice.state.pair === 'default' && initial.titleHeroDice.rewardSkinned.every(value => value === false), `${viewport.name}: title hero dice should start on default yellow/green dice ${JSON.stringify(initial.titleHeroDice)}`);
      assert(initial.titleHeroDice.state.dice[0].motionSlot === 'left' && initial.titleHeroDice.state.dice[0].animationName === 'startYellowStartled' && initial.titleHeroDice.state.dice[1].motionSlot === 'right' && initial.titleHeroDice.state.dice[1].animationName === 'startGreenStartled', `${viewport.name}: default title hero dice should use the shared left/right idle and bite motion ${JSON.stringify(initial.titleHeroDice.state)}`);
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
        const clearLegal = initial.quitRect.top >= initial.titleLayout.legalRect.bottom + 4 ||
          initial.quitRect.left >= initial.titleLayout.legalRect.right + 4 ||
          initial.quitRect.right <= initial.titleLayout.legalRect.left - 4 ||
          initial.quitRect.bottom <= initial.titleLayout.legalRect.top - 4;
        assert(clearLegal, `${viewport.name}: mobile quit button overlaps legal copy ${JSON.stringify({ quit: initial.quitRect, legal: initial.titleLayout.legalRect })}`);
      } else {
        assert(initial.quitRect.top <= 24, `${viewport.name}: desktop/tablet quit button should remain easy to find at top right ${JSON.stringify(initial.quitRect)}`);
      }
      assert(initial.quitSheetHidden === true, `${viewport.name}: quit fallback sheet should start hidden`);
      assert(initial.startText.trim() === EXPECTED_START_CTA, `${viewport.name}: start CTA should be ${EXPECTED_START_CTA}`);
      assert(initial.badgeText.trim() === '' && initial.betaWipCopyPresent === false, `${viewport.name}: beta WIP badge/copy should not be visible in retail ${JSON.stringify(initial)}`);
      assert(initial.legacyIpadGuidance && initial.legacyIpadGuidance.visible === false, `${viewport.name}: legacy iPad guidance should stay hidden outside legacy profile ${JSON.stringify(initial.legacyIpadGuidance)}`);
      assert(TRASH_DICE_VERSION_PATTERN.test(initial.version), `${viewport.name}: version should use dev/live retail format ${JSON.stringify(initial)}`);
      assert(initial.version === EXPECTED_TRASH_DICE_VERSION, `${viewport.name}: version data changed without updating QA/report contract ${JSON.stringify(initial)}`);
      assert(initial.versionLabel === EXPECTED_TRASH_DICE_VERSION_LABEL, `${viewport.name}: version label data missing ${JSON.stringify(initial)}`);
      assert(initial.titleLayout.buildVersionText === EXPECTED_TRASH_DICE_VERSION_LABEL && initial.titleLayout.buildVersionWhiteSpace === 'nowrap' && initial.titleLayout.buildVersionFitsViewport === true, `${viewport.name}: title build version should render visibly ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.titleLayout.buildVersionLowerLeft === true && initial.titleLayout.buildVersionClearLegal === true && initial.titleLayout.buildVersionClearStartCard === true && initial.titleLayout.buildVersionBelowStartCard === true, `${viewport.name}: title build version should stay in the lower-left footer zone without touching the hero die panel ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.orientationLock.bodyBlocked === false && initial.orientationLock.datasetBlocked === 'false' && initial.orientationLock.hidden === true && initial.orientationLock.ariaHidden === 'true', `${viewport.name}: portrait/desktop gameplay viewport should not show rotate blocker ${JSON.stringify(initial.orientationLock)}`);
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
      await evalValue(page, `window.localStorage.setItem('trashDiceRewardWinsV1', '3'); window.sessionStorage.setItem('trashDiceSessionRewardWinsV1', '100'); true`);
      await page.cdp('Page.navigate', { url: `${baseUrl}?source=qa&qa=1&staleRewardProbe=${encodeURIComponent(viewport.name)}` });
      await sleep(700);
      await waitEval(page, `!!window.TrashDiceQA && window.TrashDiceQA.state().qaHooks === true`, `${viewport.name} stale reward storage reload`);
      const staleRewardStorage = await evalValue(page, `(() => {
        const state = window.TrashDiceQA.rewardDieState();
        const skin = window.TrashDiceQA.rewardSkinProbe();
        return {
          stored: window.localStorage.getItem('trashDiceRewardWinsV1'),
          totalWins: state.totalWins,
          activeTier: state.activeTier,
          activeName: state.activeName,
          playerRewardSkinned: skin.playerDie.rewardSkinned,
          playerTier: skin.playerDie.tier,
          previewOverride: skin.previewOverride,
          sessionStored: window.sessionStorage.getItem('trashDiceSessionRewardWinsV1'),
          bodyVip: document.body.classList.contains('vip-disco-party'),
          bodyVipDataset: document.body.dataset.vipDiscoParty || ''
        };
      })()`);
      assert(staleRewardStorage.stored === null && staleRewardStorage.sessionStored === null && staleRewardStorage.totalWins === 0 && staleRewardStorage.activeTier === 0 && staleRewardStorage.playerRewardSkinned === false && staleRewardStorage.playerTier === '' && staleRewardStorage.bodyVip === false && staleRewardStorage.bodyVipDataset === '', `${viewport.name}: stale reward storage should not skin a fresh session or start VIP cosmic lighting ${JSON.stringify(staleRewardStorage)}`);
      rewardConfig = await evalValue(page, `window.TrashDiceQA.rewardDiceConfig()`);
      rewardConfigNames = rewardConfig.map(item => item.name);
      const titleRewardConfig = rewardConfig.filter(item => !item.vip && item.effect !== 'discoBall');
      rewardPairCount = Math.ceil(titleRewardConfig.length / 2);
      rewardPairNames = Array.from({ length: rewardPairCount }, (_, i) =>
        [titleRewardConfig[i * 2], titleRewardConfig[i * 2 + 1]].map(item => item ? item.name : 'DEFAULT').join('|')
      );
      rewardFirst = rewardConfig[0];
      rewardSecond = rewardConfig[1];
      rewardCapDie = rewardConfig[rewardConfig.length - 1];
      rewardAtTwo = rewardAtWins(rewardConfig, 2);
      rewardNextAfterTwo = nextRewardAtWins(rewardConfig, 2);
      rewardAtSix = rewardAtWins(rewardConfig, 6);
      rewardNextAfterSix = nextRewardAtWins(rewardConfig, 6);
      rewardAtEleven = rewardAtMinWins(rewardConfig, 11);
      rewardNextAfterEleven = nextRewardAtWins(rewardConfig, 11);
      rewardPrism = rewardConfig.find(item => item.name === 'PRISM');
      const rewardDiamond = rewardConfig.find(item => item.name === 'DIAMOND');
      const rewardDisco = rewardConfig.find(item => item.name === 'DISCO');
      assert(rewardPrism && rewardPrism.minWins === 9 && rewardPrism.effect === 'colorCycle', `${viewport.name}: PRISM reward config missing or changed ${JSON.stringify({ rewardPrism, rewardConfig })}`);
      assert(rewardDiamond && rewardDisco && rewardDisco.effect === 'discoBall' && rewardDisco.faceColor !== rewardDiamond.faceColor && rewardDisco.pipColor !== rewardDiamond.pipColor && rewardDisco.pipOutline === false && rewardDiamond.pipOutline === true, `${viewport.name}: DISCO should not reuse DIAMOND's pale crystal visual config ${JSON.stringify({ rewardDiamond, rewardDisco })}`);
      const cosmicProgression = await evalValue(page, `(() => {
        const snap = wins => {
          window.TrashDiceQA.setRewardWins(wins);
          const state = window.TrashDiceQA.rewardDieState();
          return {
            wins,
            activeName: state.activeName,
            nextName: state.nextDie ? state.nextDie.name : '',
            nextMinWins: state.nextDie ? state.nextDie.minWins : 0,
            capped: state.capped,
            cosmicAmbientUnlocked: state.cosmicAmbientUnlocked,
            bodyVip: document.body.classList.contains('vip-disco-party'),
            bodyVipDataset: document.body.dataset.vipDiscoParty || ''
          };
        };
        const beforeAmbient = snap(7);
        const ambient = snap(8);
        const cap = snap(12);
        window.TrashDiceQA.setRewardWins(0);
        return { beforeAmbient, ambient, cap };
      })()`);
      assert(cosmicProgression.beforeAmbient.activeName === 'DIAMOND' && cosmicProgression.beforeAmbient.nextName === 'PRISM' && cosmicProgression.beforeAmbient.cosmicAmbientUnlocked === false && cosmicProgression.beforeAmbient.bodyVip === false, `${viewport.name}: COSMIC ambient should stay locked before 8 round wins ${JSON.stringify(cosmicProgression)}`);
      assert(cosmicProgression.ambient.activeName === 'DIAMOND' && cosmicProgression.ambient.nextName === 'PRISM' && cosmicProgression.ambient.cosmicAmbientUnlocked === true && cosmicProgression.ambient.bodyVip === true && cosmicProgression.ambient.bodyVipDataset === 'true', `${viewport.name}: COSMIC ambient should unlock at 8 without changing the active die ${JSON.stringify(cosmicProgression)}`);
      assert(cosmicProgression.cap.activeName === 'DISCO' && cosmicProgression.cap.nextName === '' && cosmicProgression.cap.capped === true && cosmicProgression.cap.cosmicAmbientUnlocked === true && cosmicProgression.cap.bodyVip === true, `${viewport.name}: DISCO die should cap the session ladder at 12 round wins ${JSON.stringify(cosmicProgression)}`);
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
      assert(initial.titleLayout.titleTaglinePresent === false, `${viewport.name}: title tagline should move off the title screen ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.titleLayout.startCardToLegal >= 8, `${viewport.name}: start card overlaps title legal ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.titleLayout.copyrightText === '© 2026 Big Discoveries. Trash Dice™.' && initial.titleLayout.copyrightWhiteSpace === 'nowrap' && initial.titleLayout.copyrightFitsViewport === true, `${viewport.name}: title copyright should stay on one fitted line ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.titleLayout.studioLabelText === 'Digital companion by', `${viewport.name}: title studio credit label missing ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.titleLayout.copyrightToStudio >= 4 && initial.titleLayout.studioToOdg <= initial.titleLayout.copyrightToStudio + 4, `${viewport.name}: studio credit should group with ODG logo, not Big Discoveries copyright ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.titleLayout.studioLabelColor.includes('47, 52, 45'), `${viewport.name}: studio credit color should match ODG wordmark family ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.titleLayout.odgLogoSrc.includes('assets/brand/odg-logo-charcoal.png') && initial.titleLayout.odgLogoAlt === 'OneDayGames', `${viewport.name}: title ODG wordmark missing ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.titleLayout.presenterSubHeight >= (viewport.mobile ? 8 : 9), `${viewport.name}: Presents text too small ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.titleLayout.odgRect.width >= (viewport.mobile ? 100 : 104) && initial.titleLayout.odgRect.height >= 30, `${viewport.name}: title ODG wordmark too small ${JSON.stringify(initial.titleLayout)}`);
      assert(Math.abs(initial.titleLayout.odgCenterOffset) <= 3, `${viewport.name}: title ODG wordmark is not centered ${JSON.stringify(initial.titleLayout)}`);
      assert(initial.badgeRect === null, `${viewport.name}: beta badge should be removed from retail title ${JSON.stringify(initial.badgeRect)}`);
      const titleHeroDiceCycle = await evalValue(page, `(() => {
        const pairCount = Math.ceil(window.TrashDiceQA.rewardDiceConfig().filter(item => !item.vip && item.effect !== 'discoBall').length / 2);
        return Array.from({ length: pairCount + 2 }, () => window.TrashDiceQA.advanceTitleHeroDiceCycle());
      })()`);
      const titleHeroDiceNames = titleHeroDiceCycle.map(step => step.dice.map(die => die.rewardName || 'DEFAULT').join('|'));
      const titleRewardCycleSteps = titleHeroDiceCycle.slice(0, rewardPairCount);
      const titleExpectedRewardDie = (stepIndex, dieIndex) => titleRewardConfig[stepIndex * 2 + dieIndex] || null;
      const everyTitleRewardDie = predicate => titleRewardCycleSteps.every((step, stepIndex) =>
        step.dice.every((die, dieIndex) => predicate(die, titleExpectedRewardDie(stepIndex, dieIndex), stepIndex, dieIndex))
      );
      assert(titleHeroDiceNames.join(' > ') === [...rewardPairNames, 'DEFAULT|DEFAULT', rewardPairNames[0]].join(' > '), `${viewport.name}: title hero dice should cycle reward pairs on can passes ${JSON.stringify({ rewardConfig, titleHeroDiceCycle })}`);
      assert(titleHeroDiceCycle.every(step => step.dice.every(die => die.rewardName !== 'DISCO' && die.rewardEffect !== 'discoBall')), `${viewport.name}: VIP DISCO should never appear in the title reward dice cycle ${JSON.stringify(titleHeroDiceCycle)}`);
      assert(everyTitleRewardDie((die, expected) => expected ? (die.rewardSkinned === true && die.rewardTier === String(expected.tier) && die.rewardEffect === expected.effect) : (die.rewardSkinned === false && die.rewardTier === '' && die.rewardEffect === '')), `${viewport.name}: title reward dice cycle should apply reward visuals and restore the odd final partner to default ${JSON.stringify(titleHeroDiceCycle)}`);
      assert(everyTitleRewardDie((die, expected) => expected ? die.usesRewardDieComponent === true : die.usesRewardDieComponent === false), `${viewport.name}: title reward dice should use the in-game reward component only for configured reward dice ${JSON.stringify(titleHeroDiceCycle)}`);
      assert(titleRewardCycleSteps.every(step => step.dice[0].motionSlot === 'left' && step.dice[0].animationName === 'startYellowStartled' && step.dice[1].motionSlot === 'right' && step.dice[1].animationName === 'startGreenStartled'), `${viewport.name}: title reward dice should share the default left/right idle and can-bite jump animations ${JSON.stringify(titleHeroDiceCycle)}`);
      assert(everyTitleRewardDie((die, expected) => !expected || (die.shellFilter.includes('drop-shadow') && die.depthFilter.includes('drop-shadow') && die.depthFilterDropCount === 1 && die.sideContent === 'none' && die.titleDepthEdge && die.titleDepthMid && die.titleDepthDark && die.depthSideContent !== 'none' && die.depthSideBackground.includes('gradient') && die.depthSideBoxShadow.includes('rgba') && Number.parseFloat(die.depthSideOpacity || '0') >= 0.9 && die.depthSideTransform !== 'none' && die.faceBoxShadow.includes('inset') && die.afterContent === 'none')), `${viewport.name}: title reward dice should keep one color-coordinated 3D backing layer without the extra stacked plates ${JSON.stringify(titleHeroDiceCycle)}`);
      if (viewport.mobile && viewport.width <= 720) {
        assert(everyTitleRewardDie((die, expected) => !expected || (die.faceOverflow === 'hidden' && die.faceClipPath && die.faceClipPath !== 'none' && die.faceBorderRadius !== '0px')), `${viewport.name}: mobile title reward dice should hard-clip the skin face while preserving external 3D backing/shadow ${JSON.stringify(titleHeroDiceCycle)}`);
      }
      assert(everyTitleRewardDie((die, expected) => die.dotCells === 9 && (expected ? die.dots === 5 : die.dots >= 1)), `${viewport.name}: title reward dice should render reward pips while preserving default geometry for an odd final partner ${JSON.stringify(titleHeroDiceCycle)}`);
      assert(titleHeroDiceCycle[rewardPairCount].dice.every(die => die.rewardSkinned === false && die.usesRewardDieComponent === false && die.dotCells === 9), `${viewport.name}: title hero dice should restore default geometry after reward pairs ${JSON.stringify(titleHeroDiceCycle[rewardPairCount])}`);
      if (viewport.mobile) {
        assert(initial.titleLayout.presenterToTitle >= 8, `${viewport.name}: mobile presenter overlaps Trash Dice logo ${JSON.stringify(initial.titleLayout)}`);
        assert(initial.titleLayout.startCardToLegal >= 8, `${viewport.name}: mobile start card overlaps legal ${JSON.stringify(initial.titleLayout)}`);
        if (viewport.width <= 720) {
          assert(initial.titleLayout.presenterLogoWidth <= 150, `${viewport.name}: mobile presenter logo too large ${JSON.stringify(initial.titleLayout)}`);
        } else {
          const compactTabletLandscape = viewport.height <= 760;
          assert(initial.titleLayout.presenterLogoWidth <= (compactTabletLandscape ? 122 : 152), `${viewport.name}: tablet presenter logo too large ${JSON.stringify(initial.titleLayout)}`);
          assert(initial.titleLayout.presenterToTitle >= (compactTabletLandscape ? 8 : 28), `${viewport.name}: tablet presenter needs breathing room above Trash Dice logo ${JSON.stringify(initial.titleLayout)}`);
          assert(initial.titleLayout.titleToStartCard >= (compactTabletLandscape ? 16 : 28) && initial.titleLayout.titleToStartCard <= (compactTabletLandscape ? 96 : 115), `${viewport.name}: tablet title-to-start-card spacing is off ${JSON.stringify(initial.titleLayout)}`);
          if (initial.ipadTitleCanHidden) {
            assert(initial.titleLayout.startCanVisible === false && initial.titleLayout.startCanDisplay === 'none', `${viewport.name}: iPad title can should be hidden instead of parked beside the start card ${JSON.stringify(initial.titleLayout)}`);
          } else {
            assert(initial.titleLayout.startCanRect.width >= (compactTabletLandscape ? 96 : 120), `${viewport.name}: tablet title can should read as a scene prop ${JSON.stringify(initial.titleLayout)}`);
            if (compactTabletLandscape) {
              assert(initial.titleLayout.startCanRect.right >= 48 && initial.titleLayout.startCanRect.left <= viewport.width - 48, `${viewport.name}: landscape title can should stay visibly in the scene ${JSON.stringify(initial.titleLayout)}`);
            } else {
              assert(initial.titleLayout.startCanRect.left >= 0, `${viewport.name}: tablet title can should not be cut off ${JSON.stringify(initial.titleLayout)}`);
              assert(initial.titleLayout.startCanToCard >= -24 && initial.titleLayout.startCanToCard <= 36, `${viewport.name}: tablet title can should sit near the start card ${JSON.stringify(initial.titleLayout)}`);
            }
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
        const gameTagline = document.querySelector('.game-tagline');
        const p0Button = document.getElementById('devP0Btn');
        const p1AutoButton = document.getElementById('devP1AutoBtn');
        const rewardButton = document.getElementById('devRewardDieBtn');
        const discoButton = document.getElementById('devDiscoBtn');
        const outcomeControls = document.getElementById('debugOutcomeControls');
        const quitButton = document.getElementById('quitGameBtn');
        const badge = document.querySelector('.milestone-badge');
        const rr = roll.getBoundingClientRect();
        const pr = panel.getBoundingClientRect();
        const tr = gameTagline ? gameTagline.getBoundingClientRect() : null;
        const br = p0Button.getBoundingClientRect();
        const p1r = p1AutoButton.getBoundingClientRect();
        const rbr = rewardButton.getBoundingClientRect();
        const dr = discoButton.getBoundingClientRect();
        const or = outcomeControls.getBoundingClientRect();
        const qr = quitButton.getBoundingClientRect();
        const gr = badge ? badge.getBoundingClientRect() : null;
        const panelStyle = getComputedStyle(panel);
        const clears = (a, b, gap = 4) => a.bottom <= b.top - gap || a.left >= b.right + gap || a.right <= b.left - gap || a.top >= b.bottom + gap;
        return {
          rollVisible: rr.width > 44 && rr.height > 44 && rr.bottom <= window.innerHeight + 1 && rr.top >= -1,
          panelVisible: pr.width > 120 && pr.height > 48 && pr.bottom <= window.innerHeight + 1,
          gameTagline: gameTagline ? {
            text: gameTagline.textContent.trim(),
            visible: getComputedStyle(gameTagline).display !== 'none' && tr.width > 80 && tr.height >= 8 && tr.bottom <= pr.bottom + 1,
            belowRoll: tr.top >= rr.bottom - 1,
            inPanel: tr.left >= pr.left - 1 && tr.right <= pr.right + 1,
            rect: { top: tr.top, bottom: tr.bottom, left: tr.left, right: tr.right, width: tr.width, height: tr.height }
          } : null,
          p0ButtonVisible: getComputedStyle(p0Button).display !== 'none' && br.width > 32 && br.height > 24 && br.right <= window.innerWidth + 1 && br.top >= -1,
          p1AutoButtonVisible: getComputedStyle(p1AutoButton).display !== 'none' && p1r.width > 48 && p1r.height > 24 && p1r.right <= window.innerWidth + 1 && p1r.top >= -1,
          p1AutoButtonText: p1AutoButton.textContent.trim(),
          p1AutoButtonAudienceClass: p1AutoButton.classList.contains('auto-play-btn'),
          rewardButtonVisible: getComputedStyle(rewardButton).display !== 'none' && rbr.width > 32 && rbr.height > 24 && rbr.right <= window.innerWidth + 1 && rbr.top >= -1,
          discoButtonVisible: getComputedStyle(discoButton).display !== 'none' && dr.width > 42 && dr.height > 24 && dr.right <= window.innerWidth + 1 && dr.top >= -1,
          discoClearsRewardButton: dr.right <= rbr.left - 3 || dr.bottom <= rbr.top - 3 || dr.top >= rbr.bottom + 3,
          discoClearsRoll: clears(dr, rr, 6),
          discoClearsRollPanel: clears(dr, pr, 6),
          outcomeButtonsVisible: getComputedStyle(outcomeControls).display !== 'none' && or.width > 32 && or.height > 22 && or.right <= window.innerWidth + 1 && or.top >= -1,
          quitButtonVisible: getComputedStyle(quitButton).display !== 'none' && qr.width >= 88 && qr.height >= 42 && qr.right <= window.innerWidth - 6 && qr.left >= 0 && qr.top >= -1 && qr.bottom <= window.innerHeight + 1,
          quitClearsRoll: qr.bottom <= rr.top - 4 || qr.left >= rr.right + 4 || qr.right <= rr.left - 4 || qr.top >= rr.bottom + 4,
          debugClearsQuit: (br.bottom <= qr.top - 4 || br.left >= qr.right + 4 || br.right <= qr.left - 4 || br.top >= qr.bottom + 4) &&
            (p1r.bottom <= qr.top - 4 || p1r.left >= qr.right + 4 || p1r.right <= qr.left - 4 || p1r.top >= qr.bottom + 4) &&
            (rbr.bottom <= qr.top - 4 || rbr.left >= qr.right + 4 || rbr.right <= qr.left - 4 || rbr.top >= qr.bottom + 4) &&
            (dr.bottom <= qr.top - 4 || dr.left >= qr.right + 4 || dr.right <= qr.left - 4 || dr.top >= qr.bottom + 4) &&
            (or.bottom <= qr.top - 4 || or.left >= qr.right + 4 || or.right <= qr.left - 4 || or.top >= qr.bottom + 4),
          debugLowerRight: br.left >= window.innerWidth * 0.62 && p1r.left >= window.innerWidth * 0.62 && rbr.left >= window.innerWidth * 0.62 && dr.left >= window.innerWidth * 0.62 && or.left >= window.innerWidth * 0.62 && br.top >= window.innerHeight * 0.42 && p1r.top >= window.innerHeight * 0.42 && rbr.top >= window.innerHeight * 0.42 && dr.top >= window.innerHeight * 0.42 && or.top >= window.innerHeight * 0.42,
          badgePresent: !!badge,
          bodyFits: document.body.scrollWidth <= window.innerWidth + 1,
          disabled: roll.disabled,
          panelCursor: panelStyle.cursor,
          panelTouchAction: panelStyle.touchAction,
          poolCounts: Array.from(document.querySelectorAll('.pool-count')).map(el => {
            const style = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return {
              id: el.id,
              text: el.textContent.trim(),
              fontFamily: style.fontFamily,
              fontVariantNumeric: style.fontVariantNumeric,
              fontFeatureSettings: style.fontFeatureSettings,
              width: r.width,
              height: r.height
            };
          }),
          rollRect: { top: rr.top, bottom: rr.bottom, left: rr.left, right: rr.right, width: rr.width, height: rr.height },
          panelRect: { top: pr.top, bottom: pr.bottom, left: pr.left, right: pr.right, width: pr.width, height: pr.height },
          p0ButtonRect: { top: br.top, bottom: br.bottom, left: br.left, right: br.right, width: br.width, height: br.height },
          p1AutoButtonRect: { top: p1r.top, bottom: p1r.bottom, left: p1r.left, right: p1r.right, width: p1r.width, height: p1r.height },
          rewardButtonRect: { top: rbr.top, bottom: rbr.bottom, left: rbr.left, right: rbr.right, width: rbr.width, height: rbr.height },
          discoButtonRect: { top: dr.top, bottom: dr.bottom, left: dr.left, right: dr.right, width: dr.width, height: dr.height },
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
      assert(activeLayout.gameTagline && activeLayout.gameTagline.text === 'ROLL. COLLECT. AVOID THE TRASH.' && activeLayout.gameTagline.visible && activeLayout.gameTagline.belowRoll && activeLayout.gameTagline.inPanel, `${viewport.name}: game tagline should sit under roll button ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.p0ButtonVisible, `${viewport.name}: P-0 button not visible in viewport ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.p1AutoButtonVisible && activeLayout.p1AutoButtonText === 'AUTO' && activeLayout.p1AutoButtonAudienceClass === true, `${viewport.name}: AUTO button not visible or audience-facing in viewport ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.rewardButtonVisible, `${viewport.name}: reward review button not visible in viewport ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.discoButtonVisible, `${viewport.name}: DISCO debug button not visible in viewport ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.discoClearsRewardButton, `${viewport.name}: DISCO debug button overlaps reward DIE button ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.discoClearsRoll && activeLayout.discoClearsRollPanel, `${viewport.name}: DISCO debug button overlaps Roll action area ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.outcomeButtonsVisible, `${viewport.name}: outcome buttons not visible in viewport ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.quitButtonVisible, `${viewport.name}: quit button not visible or not large enough in active game ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.quitClearsRoll, `${viewport.name}: quit button overlaps roll/play action ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.debugClearsQuit, `${viewport.name}: debug controls overlap Done ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.debugLowerRight, `${viewport.name}: debug controls are not in the lower-right tool corner ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.badgePresent === false, `${viewport.name}: beta badge should stay absent in active retail game ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.bodyFits, `${viewport.name}: active game creates horizontal overflow ${JSON.stringify(activeLayout)}`);
      assert(activeLayout.poolCounts.length === 2 && activeLayout.poolCounts.every(count => /Fredoka One/i.test(count.fontFamily) && !/Bangers/i.test(count.fontFamily) && count.width >= 24 && count.height >= 24), `${viewport.name}: pool-count numerals should use the legible badge font ${JSON.stringify(activeLayout.poolCounts)}`);
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
      assert(activeLayout.panelCursor === 'pointer', `${viewport.name}: roll panel should advertise tappable action surface ${JSON.stringify(activeLayout)}`);
      const rollPanelHitPage = await openPage(`${baseUrl}?source=qa&qa=1&roll-panel-hit=tagline`, viewport);
      await evalValue(rollPanelHitPage, `document.getElementById('startBtn').click(); true`);
      await waitEval(rollPanelHitPage, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, `${viewport.name} roll panel hit target game start`);
      const rollPanelHitStart = await evalValue(rollPanelHitPage, `(() => {
        const tagline = document.querySelector('.game-tagline');
        const panel = document.querySelector('.roll-panel');
        const roll = document.getElementById('rollBtn');
        const state = window.TrashDiceQA.state();
        const rollDisabledBefore = !!(roll && roll.disabled);
        if (tagline) tagline.click();
        return {
          hadTagline: !!tagline,
          hadPanel: !!panel,
          rollDisabledBefore,
          totalRollsBefore: state.totalRolls
        };
      })()`);
      await waitEval(rollPanelHitPage, `window.TrashDiceQA.state().totalRolls > ${JSON.stringify(rollPanelHitStart.totalRollsBefore)}`, `${viewport.name} roll panel tagline click rolls`);
      const rollPanelHit = await evalValue(rollPanelHitPage, `(() => {
        const state = window.TrashDiceQA.state();
        const panel = document.querySelector('.roll-panel');
        const tagline = document.querySelector('.game-tagline');
        return {
          start: ${JSON.stringify(rollPanelHitStart)},
          totalRolls: state.totalRolls,
          busy: state.busy,
          current: state.current,
          rollDisabled: !!(document.getElementById('rollBtn') && document.getElementById('rollBtn').disabled),
          taglineText: tagline ? tagline.textContent.trim() : '',
          panelCursor: panel ? getComputedStyle(panel).cursor : '',
          events: window.TrashDiceAnalyticsDebug ? window.TrashDiceAnalyticsDebug.log.map(item => item.eventName) : []
        };
      })()`);
      assert(rollPanelHit.start.hadTagline === true && rollPanelHit.start.hadPanel === true && rollPanelHit.start.rollDisabledBefore === false && rollPanelHit.totalRolls === rollPanelHit.start.totalRollsBefore + 1 && rollPanelHit.events.includes('td_first_roll'), `${viewport.name}: tapping roll tagline should trigger exactly one valid roll ${JSON.stringify(rollPanelHit)}`);
      await send('Target.closeTarget', { targetId: rollPanelHitPage.targetId });
      if (viewport.mobile && viewport.width > 720) {
        assert(activeLayout.activeAnimationCount <= 3, `${viewport.name}: tablet game state has too many running animations ${JSON.stringify(activeLayout)}`);
      }
      const rewardReviewBefore = await evalValue(page, `window.TrashDiceQA.rewardDieState()`);
      await evalValue(page, `document.getElementById('devRewardDieBtn').click(); true`);
      await waitEval(page, `(() => {
        const shell = document.getElementById('rewardDieUnlock');
        const die = document.getElementById('rewardDie');
        if (!shell || !die) return false;
        const r = die.getBoundingClientRect();
        return !shell.hidden && shell.classList.contains('show') && r.width >= 140 && r.height >= 140;
      })()`, `${viewport.name} reward die review preview`);
      const rewardReview = await evalValue(page, `(() => {
        const btn = document.getElementById('devRewardDieBtn');
        const shell = document.getElementById('rewardDieUnlock');
        const scene = document.querySelector('.reward-die-scene');
        const die = document.getElementById('rewardDie');
        const name = document.getElementById('rewardDieName');
        const sub = document.getElementById('rewardDieSub');
        const playerDie = document.getElementById('p1Die');
        const r = die.getBoundingClientRect();
        const sceneRect = scene ? scene.getBoundingClientRect() : null;
        const dieStyle = getComputedStyle(die);
        const toRect = (rect) => rect ? ({
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        }) : null;
        const fitsViewport = (rect) => !!rect &&
          rect.left >= -1 &&
          rect.top >= -1 &&
          rect.right <= window.innerWidth + 1 &&
          rect.bottom <= window.innerHeight + 1;
        return {
          buttonText: btn.textContent.trim(),
          buttonLabel: btn.getAttribute('aria-label'),
          visible: !shell.hidden && shell.classList.contains('show') && r.width >= 140 && r.height >= 140,
          dieRect: toRect(r),
          sceneRect: toRect(sceneRect),
          dieFitsViewport: fitsViewport(r),
          sceneFitsViewport: fitsViewport(sceneRect),
          tier: shell.dataset.tier || die.dataset.tier || '',
          effect: shell.dataset.effect || die.dataset.effect || '',
          name: name.textContent || '',
          sub: sub ? sub.textContent || '' : '',
          dieClipStyle: {
            borderRadius: dieStyle.borderRadius,
            backgroundClip: dieStyle.backgroundClip,
            clipPath: dieStyle.clipPath || '',
            webkitClipPath: dieStyle.webkitClipPath || '',
            overflow: dieStyle.overflow || '',
            webkitMaskImage: dieStyle.webkitMaskImage || '',
            maskImage: dieStyle.maskImage || '',
            backfaceVisibility: dieStyle.backfaceVisibility || ''
          },
          playerSkin: {
            rewardSkinned: playerDie.classList.contains('reward-skinned'),
            tier: playerDie.dataset.rewardTier || '',
            name: playerDie.dataset.rewardName || '',
            effect: playerDie.dataset.rewardEffect || ''
          },
          pipCount: die.querySelectorAll('.reward-die-pip-cell.is-on .reward-die-pip').length,
          progressState: window.TrashDiceQA.rewardDieState()
        };
      })()`);
      assert(rewardReview.visible === true && rewardReview.tier === String(rewardFirst.tier) && rewardReview.name === rewardFirst.name && rewardReview.sub === 'DIE SKIN UNLOCKED' && rewardReview.effect === rewardFirst.effect && rewardReview.buttonText === `D${rewardFirst.tier}`, `${viewport.name}: reward review button did not preview first active die ${JSON.stringify({ rewardFirst, rewardReview })}`);
      assert(rewardReview.dieRect.width >= 140 && rewardReview.dieRect.height >= 140, `${viewport.name}: reward review die should be hero-sized ${JSON.stringify(rewardReview.dieRect)}`);
      assert(rewardReview.dieFitsViewport === true && rewardReview.sceneFitsViewport === true, `${viewport.name}: reward review die should stay inside viewport ${JSON.stringify({ dieRect: rewardReview.dieRect, sceneRect: rewardReview.sceneRect })}`);
      if (viewport.mobile && viewport.width <= 720) {
        assert(/padding-box/i.test(rewardReview.dieClipStyle.backgroundClip) && /radial-gradient/i.test(rewardReview.dieClipStyle.webkitMaskImage) && /hidden/i.test(rewardReview.dieClipStyle.backfaceVisibility), `${viewport.name}: mobile reward unlock die should use soft clipped edges ${JSON.stringify(rewardReview.dieClipStyle)}`);
      }
      if (viewport.mobile && viewport.width > 720) {
        assert(/padding-box/i.test(rewardReview.dieClipStyle.backgroundClip) && /round/i.test(rewardReview.dieClipStyle.clipPath || rewardReview.dieClipStyle.webkitClipPath || '') && /radial-gradient/i.test(rewardReview.dieClipStyle.webkitMaskImage) && /hidden/i.test(rewardReview.dieClipStyle.overflow) && /hidden/i.test(rewardReview.dieClipStyle.backfaceVisibility), `${viewport.name}: iPad reward unlock die should keep rounded clipped edges while composited ${JSON.stringify(rewardReview.dieClipStyle)}`);
      }
      assert(rewardReview.playerSkin.rewardSkinned === true && rewardReview.playerSkin.tier === String(rewardFirst.tier) && rewardReview.playerSkin.name === rewardFirst.name && rewardReview.playerSkin.effect === rewardFirst.effect, `${viewport.name}: reward review should skin the real player die ${JSON.stringify({ rewardFirst, playerSkin: rewardReview.playerSkin })}`);
      assert(rewardReview.progressState.totalWins === rewardReviewBefore.totalWins && rewardReview.progressState.activeTier === rewardReviewBefore.activeTier, `${viewport.name}: reward review should not change unlock progress ${JSON.stringify({ before: rewardReviewBefore, after: rewardReview.progressState })}`);

      await evalValue(page, `document.getElementById('devDiscoBtn').click(); true`);
      await waitEval(page, `document.body.classList.contains('vip-disco-party') && window.TrashDiceQA.rewardDieState().activeName === 'DISCO'`, `${viewport.name} DISCO debug button activates VIP mode`);
      const discoDebug = await evalValue(page, `(() => {
        const btn = document.getElementById('devDiscoBtn');
        const rewardBtn = document.getElementById('devRewardDieBtn');
        const playerDie = document.getElementById('p1Die');
        const shell = document.getElementById('rewardDieUnlock');
        const cosmic = document.querySelector('.vip-cosmic-sky');
        const bodyBefore = getComputedStyle(document.body, '::before');
        const bodyAfter = getComputedStyle(document.body, '::after');
        const cosmicStyle = cosmic ? getComputedStyle(cosmic) : null;
        const cosmicBefore = cosmic ? getComputedStyle(cosmic, '::before') : null;
        const cosmicAfter = cosmic ? getComputedStyle(cosmic, '::after') : null;
        const playerDieStyle = getComputedStyle(playerDie);
        return {
          buttonVisible: getComputedStyle(btn).display !== 'none',
          pressed: btn.getAttribute('aria-pressed'),
          label: btn.getAttribute('aria-label'),
          rewardButtonText: rewardBtn ? rewardBtn.textContent.trim() : '',
          rewardButtonLabel: rewardBtn ? rewardBtn.getAttribute('aria-label') : '',
          rewardUnlockHidden: !shell || shell.hidden || !shell.classList.contains('show'),
          state: window.TrashDiceQA.rewardDieState(),
          bodyVip: document.body.classList.contains('vip-disco-party'),
          bodyVipDataset: document.body.dataset.vipDiscoParty || '',
          discoVenueWashOpacity: bodyBefore.opacity || '',
          discoVenueWashZIndex: bodyBefore.zIndex || '',
          discoVenueWashBackground: bodyBefore.backgroundImage || '',
          discoOverlayAnimation: bodyAfter.animationName || '',
          discoOverlayAnimationDuration: bodyAfter.animationDuration || '',
          discoOverlayOpacity: bodyAfter.opacity || '',
          discoOverlayPointerEvents: bodyAfter.pointerEvents || '',
          discoOverlayZIndex: bodyAfter.zIndex || '',
          discoOverlayBlend: bodyAfter.mixBlendMode || '',
          discoOverlayBackground: bodyAfter.backgroundImage || '',
          discoOverlayFilter: bodyAfter.filter || '',
          cosmicSky: cosmic ? {
            display: cosmicStyle.display || '',
            opacity: cosmicStyle.opacity || '',
            zIndex: cosmicStyle.zIndex || '',
            pointerEvents: cosmicStyle.pointerEvents || '',
            animationName: cosmicStyle.animationName || '',
            animationDuration: cosmicStyle.animationDuration || '',
            beforeBackground: cosmicBefore.backgroundImage || '',
            beforeAnimationName: cosmicBefore.animationName || '',
            afterBackground: cosmicAfter.backgroundImage || '',
            afterAnimationName: cosmicAfter.animationName || '',
            afterAnimationDuration: cosmicAfter.animationDuration || '',
            afterOpacity: cosmicAfter.opacity || '',
            afterTransform: cosmicAfter.transform || ''
          } : null,
          playerDieBoxShadow: playerDieStyle.boxShadow || '',
          playerSkin: {
            rewardSkinned: playerDie.classList.contains('reward-skinned'),
            tier: playerDie.dataset.rewardTier || '',
            name: playerDie.dataset.rewardName || '',
            effect: playerDie.dataset.rewardEffect || ''
          }
        };
      })()`);
      assert(discoDebug.buttonVisible === true && discoDebug.pressed === 'true' && discoDebug.label === 'DISCO die active', `${viewport.name}: DISCO button active state wrong ${JSON.stringify(discoDebug)}`);
      assert(discoDebug.state.totalWins === rewardCapDie.minWins && discoDebug.state.activeName === rewardCapDie.name && discoDebug.state.activeDie && discoDebug.state.activeDie.effect === 'discoBall' && discoDebug.state.capped === true, `${viewport.name}: DISCO debug button should jump to VIP reward state ${JSON.stringify({ rewardCapDie, discoDebug })}`);
      const discoOverlayConics = (discoDebug.discoOverlayBackground.match(/conic-gradient/g) || []).length;
      const discoOverlayRadials = (discoDebug.discoOverlayBackground.match(/radial-gradient/g) || []).length;
      const discoOverlayLinears = (discoDebug.discoOverlayBackground.match(/linear-gradient/g) || []).length;
      const discoVenueRadials = (discoDebug.discoVenueWashBackground.match(/radial-gradient/g) || []).length;
      const discoVenueLinears = (discoDebug.discoVenueWashBackground.match(/linear-gradient/g) || []).length;
      const cosmicBeforeRadials = discoDebug.cosmicSky ? (discoDebug.cosmicSky.beforeBackground.match(/radial-gradient/g) || []).length : 0;
      const cosmicAfterLinears = discoDebug.cosmicSky ? (discoDebug.cosmicSky.afterBackground.match(/linear-gradient/g) || []).length : 0;
      const discoOverlayDuration = parseFloat(discoDebug.discoOverlayAnimationDuration || '0');
      const discoOverlayOldAnchors = /at\s+80%\s+60%|at\s+16%\s+72%/i.test(discoDebug.discoOverlayBackground);
      assert(discoDebug.bodyVip === true && discoDebug.bodyVipDataset === 'true' && discoDebug.discoOverlayAnimation === 'none' && discoOverlayDuration === 0 && !discoOverlayOldAnchors && Number(discoDebug.discoOverlayZIndex) <= 1 && Number(discoDebug.discoVenueWashZIndex) <= 0 && Number(discoDebug.discoOverlayOpacity) >= 0.35 && Number(discoDebug.discoVenueWashOpacity) >= 0.55 && discoDebug.discoOverlayPointerEvents === 'none' && discoDebug.discoOverlayBlend === 'normal' && discoDebug.discoOverlayFilter === 'none' && discoOverlayConics === 0 && discoOverlayRadials >= 5 && discoOverlayRadials <= 8 && discoOverlayLinears >= 3 && discoOverlayLinears <= 5 && discoVenueRadials >= 5 && discoVenueRadials <= 7 && discoVenueLinears >= 2 && discoVenueLinears <= 3, `${viewport.name}: DISCO debug button should activate visible low-layer perf-safe static lighting under the moving cosmic sky ${JSON.stringify({ discoDebug, discoOverlayConics, discoOverlayRadials, discoOverlayLinears, discoVenueRadials, discoVenueLinears, discoOverlayDuration, discoOverlayOldAnchors })}`);
      assert(discoDebug.cosmicSky && discoDebug.cosmicSky.display !== 'none' && Number(discoDebug.cosmicSky.zIndex) <= 1 && Number(discoDebug.cosmicSky.opacity) >= 0.45 && discoDebug.cosmicSky.pointerEvents === 'none' && discoDebug.cosmicSky.animationName === 'vipCosmicStarDrift' && discoDebug.cosmicSky.beforeAnimationName === 'vipCosmicTwinkle' && discoDebug.cosmicSky.afterAnimationName === 'vipCosmicRiverFlow' && Number(discoDebug.cosmicSky.afterOpacity) >= 0.24 && cosmicBeforeRadials >= 5 && cosmicBeforeRadials <= 7 && cosmicAfterLinears >= 2 && cosmicAfterLinears <= 3, `${viewport.name}: VIP future reward background should show graceful perf-safe moving cosmic ambience ${JSON.stringify({ cosmicSky: discoDebug.cosmicSky, cosmicBeforeRadials, cosmicAfterLinears })}`);
      const cosmicPerf = await evalValue(page, cosmicAmbientPerfProbeScript(viewport.mobile ? 900 : 760));
      const cosmicPerfOver50Limit = Math.max(2, Math.ceil(cosmicPerf.frames * 0.07));
      const cosmicAnimationNames = (cosmicPerf.cosmicLayerAnimations || []).map(item => item.name || '');
      assert(cosmicPerf.bodyVip === true && cosmicPerf.cosmicMotion && cosmicPerf.cosmicMotion.changed === true && cosmicPerf.cosmicLayerAnimationCount >= 2 && cosmicPerf.cosmicLayerAnimationCount <= 3 && cosmicAnimationNames.includes('vipCosmicStarDrift') && cosmicAnimationNames.includes('vipCosmicRiverFlow') && cosmicPerf.overlayAnimationName === 'none' && cosmicPerf.overlayBlend === 'normal' && cosmicPerf.overlayFilter === 'none' && cosmicPerf.overlayGradientCount <= 10 && cosmicPerf.venueFilter === 'none' && cosmicPerf.avgFrameMs <= 30 && cosmicPerf.p95FrameMs <= 55 && cosmicPerf.over50Frames <= cosmicPerfOver50Limit, `${viewport.name}: COSMIC ambient background should visibly move and stay perf-safe while active ${JSON.stringify({ cosmicPerf, cosmicPerfOver50Limit, cosmicAnimationNames })}`);
      assert(/255, 0, 204|0, 255, 172|255, 70, 201/.test(discoDebug.playerDieBoxShadow), `${viewport.name}: DISCO player die should emit a readable local party glow ${JSON.stringify(discoDebug)}`);
      assert(discoDebug.playerSkin.rewardSkinned === true && discoDebug.playerSkin.name === rewardCapDie.name && discoDebug.playerSkin.effect === rewardCapDie.effect, `${viewport.name}: DISCO debug button should skin the live player die ${JSON.stringify({ rewardCapDie, playerSkin: discoDebug.playerSkin })}`);
      assert(discoDebug.rewardUnlockHidden === true && discoDebug.rewardButtonText === `D${rewardCapDie.tier}` && discoDebug.rewardButtonLabel.includes(rewardCapDie.name), `${viewport.name}: DISCO debug button should clear preview card and sync DIE label ${JSON.stringify(discoDebug)}`);
      const preShipPerf = await evalValue(page, preShipPerfLeakProbeScript({
        cycles: 2,
        sampleMs: viewport.mobile ? 320 : 300,
        capWins: rewardCapDie.minWins,
        prismWins: rewardPrism.minWins
      }));
      assertPreShipPerfLeakProbe(viewport.name, preShipPerf);
      await evalValue(page, `window.TrashDiceQA.setRewardWins(0); true`);
      const firstGameAssist = await evalValue(page, `(() => {
        const active = window.TrashDiceQA.firstGameAssistProbe({ completedGames: 0, player: 'p1', filledSlots: 2, p1Dice: 10, p2Dice: 15, sampleCount: 96 });
        const activeCpu = window.TrashDiceQA.firstGameAssistProbe({ completedGames: 0, player: 'p2', filledSlots: 2, p1Dice: 10, p2Dice: 15, sampleCount: 96 });
        const cpuIntro = window.TrashDiceQA.firstGameAssistProbe({ completedGames: 0, player: 'p2', filledSlots: 1, p1Dice: 10, p2Dice: 15, sampleCount: 24 });
        const inactive = window.TrashDiceQA.firstGameAssistProbe({ completedGames: 1, player: 'p1', filledSlots: 2, p1Dice: 10, p2Dice: 15 });
        const softLater = window.TrashDiceQA.firstGameAssistProbe({ completedGames: 0, player: 'p1', filledSlots: 2, p1Dice: 10, p2Dice: 15, roundNumber: 2 });
        const miraclePlayer = window.TrashDiceQA.firstGameAssistProbe({ completedGames: 0, player: 'p1', filledSlots: 5, p1Dice: 3, p2Dice: 12, p1RoundWins: 1, p2RoundWins: 2, roundNumber: 4 });
        const miracleCpu = window.TrashDiceQA.firstGameAssistProbe({ completedGames: 0, player: 'p2', filledSlots: 5, p1Dice: 3, p2Dice: 12, p1RoundWins: 1, p2RoundWins: 2, roundNumber: 4 });
        const miracleInactive = window.TrashDiceQA.firstGameAssistProbe({ completedGames: 1, player: 'p1', filledSlots: 5, p1Dice: 3, p2Dice: 12, p1RoundWins: 1, p2RoundWins: 2, roundNumber: 4 });
        window.TrashDiceDebug.gameStart();
        window.TrashDiceQA.setCompletedGames(0);
        window.TrashDiceQA.setRewardWins(0);
        return { active, activeCpu, cpuIntro, inactive, softLater, miraclePlayer, miracleCpu, miracleInactive, resetState: window.TrashDiceQA.state() };
      })()`);
      assert(firstGameAssist.active.context.active === true && firstGameAssist.active.firstRoundGuardActive === true && firstGameAssist.active.afterGuardRolls > firstGameAssist.active.beforeGuardRolls, `${viewport.name}: first-round guard should activate for player in fresh game ${JSON.stringify(firstGameAssist.active)}`);
      assert(firstGameAssist.active.openHits > firstGameAssist.active.takenHits && firstGameAssist.active.takenHits > 0, `${viewport.name}: first-round player guard should be weighted, not perfect ${JSON.stringify(firstGameAssist.active)}`);
      assert(firstGameAssist.activeCpu.firstRoundGuardActive === true && firstGameAssist.activeCpu.afterGuardRolls > firstGameAssist.activeCpu.beforeGuardRolls, `${viewport.name}: first-round guard should activate for CPU in fresh game ${JSON.stringify(firstGameAssist.activeCpu)}`);
      assert(firstGameAssist.activeCpu.openHits > 0 && firstGameAssist.activeCpu.takenHits > 0, `${viewport.name}: first-round CPU guard should allow both landed and trashed rolls ${JSON.stringify(firstGameAssist.activeCpu)}`);
      assert(firstGameAssist.cpuIntro.firstRoundCpuIntroPlaced === true && firstGameAssist.cpuIntro.openSlots.includes(firstGameAssist.cpuIntro.samples[0]), `${viewport.name}: first-round CPU should get an early visible successful placement ${JSON.stringify(firstGameAssist.cpuIntro)}`);
      assert(firstGameAssist.inactive.context.active === false && firstGameAssist.inactive.firstRoundGuardActive === false && firstGameAssist.inactive.afterUses === 0 && firstGameAssist.inactive.afterGuardRolls === 0, `${viewport.name}: first-game assist should disable after one completed game ${JSON.stringify(firstGameAssist.inactive)}`);
      assert(firstGameAssist.softLater.firstRoundGuardActive === false && firstGameAssist.softLater.context.active === true && firstGameAssist.softLater.afterUses > firstGameAssist.softLater.beforeUses && firstGameAssist.softLater.afterUses <= firstGameAssist.softLater.context.maxUses, `${viewport.name}: later first-game assist should remain soft after round one ${JSON.stringify(firstGameAssist.softLater)}`);
      assert(firstGameAssist.miraclePlayer.miracleContext.active === true && firstGameAssist.miraclePlayer.afterMiracleRolls > firstGameAssist.miraclePlayer.beforeMiracleRolls && firstGameAssist.miraclePlayer.samples.length > 0 && firstGameAssist.miraclePlayer.samples.every(face => firstGameAssist.miraclePlayer.openSlots.includes(face)), `${viewport.name}: first-game miracle should force player comeback hits when low on dice ${JSON.stringify(firstGameAssist.miraclePlayer)}`);
      assert(firstGameAssist.miracleCpu.miracleContext.active === true && firstGameAssist.miracleCpu.afterMiracleRolls > firstGameAssist.miracleCpu.beforeMiracleRolls && firstGameAssist.miracleCpu.samples.length > 0 && firstGameAssist.miracleCpu.samples.every(face => !firstGameAssist.miracleCpu.openSlots.includes(face)), `${viewport.name}: first-game miracle should force CPU brake rolls when player is low on dice ${JSON.stringify(firstGameAssist.miracleCpu)}`);
      assert(firstGameAssist.miracleInactive.miracleContext.active === false && firstGameAssist.miracleInactive.afterMiracleRolls === 0, `${viewport.name}: first-game miracle should disable after one completed game ${JSON.stringify(firstGameAssist.miracleInactive)}`);
      assert(firstGameAssist.resetState.completedGames === 0 && firstGameAssist.resetState.firstGameAssist.active === true && firstGameAssist.resetState.firstRoundGuard.active === true && firstGameAssist.resetState.firstGameMiracle.rolls === 0, `${viewport.name}: first-game assist QA reset failed ${JSON.stringify(firstGameAssist.resetState.firstGameAssist)}`);
      const postLossComeback = await evalValue(page, `window.TrashDiceQA.postLossComebackProbe()`);
      assert(postLossComeback.activeBefore.pending === true && postLossComeback.activeBefore.active === true, `${viewport.name}: post-loss comeback round should arm for next round-one game ${JSON.stringify(postLossComeback)}`);
      assert(postLossComeback.takenFaces.includes(postLossComeback.cpuIntroSample) && !postLossComeback.openSlots.includes(postLossComeback.cpuIntroSample), `${viewport.name}: post-loss comeback should let CPU visibly land an intro die ${JSON.stringify(postLossComeback)}`);
      assert(postLossComeback.playerSamples.length > 0 && postLossComeback.playerSamples.every(face => postLossComeback.openSlots.includes(face)), `${viewport.name}: post-loss comeback should force player first-round hits ${JSON.stringify(postLossComeback)}`);
      assert(postLossComeback.cpuSamples.length > 0 && postLossComeback.cpuSamples.some(face => postLossComeback.openSlots.includes(face)) && postLossComeback.cpuSamples.some(face => postLossComeback.takenFaces.includes(face)), `${viewport.name}: post-loss comeback CPU brake should be soft after visible placement ${JSON.stringify(postLossComeback)}`);
      assert(postLossComeback.activeAfterSamples.pending === true && postLossComeback.activeAfterSamples.rolls >= postLossComeback.playerSamples.length + 1, `${viewport.name}: post-loss comeback should stay active through the protected first round and record assisted rolls ${JSON.stringify(postLossComeback)}`);
      assert(postLossComeback.consumed.pending === false && postLossComeback.consumed.consumed === true && postLossComeback.consumed.last && postLossComeback.consumed.last.winner === 'p1', `${viewport.name}: post-loss comeback should consume after the protected round completes ${JSON.stringify(postLossComeback)}`);

      await evalValue(page, `document.getElementById('rollBtn').click(); true`);
      await waitEval(page, `window.TrashDiceAnalyticsDebug.log.some(item => item.eventName === 'td_first_roll')`, `${viewport.name} first roll analytics`);
      const rewardCap = await evalValue(page, `(() => {
        window.TrashDiceQA.setRewardWins(12);
        const cap = window.TrashDiceQA.rewardDieState();
        window.TrashDiceQA.setRewardWins(2);
        return cap;
      })()`);
      const rewardSpecials = rewardConfig.filter(item => REWARD_SPECIAL_NAMES.includes(item.name));
      const rewardMissingBaseNames = REWARD_BASE_NAMES.filter(name => !rewardConfigNames.includes(name));
      assert(rewardCap.activeTier === rewardCapDie.tier && rewardCap.activeName === rewardCapDie.name && rewardCap.capped === true && rewardCap.nextDie === null, `${viewport.name}: reward die cap should stay permanent at final active rung ${JSON.stringify({ rewardCapDie, rewardCap })}`);
      assert(rewardConfig.length === 11 && new Set(rewardConfig.map(item => item.tier)).size === 11, `${viewport.name}: reward dice should expose the base ten plus VIP DISCO rung ${JSON.stringify(rewardConfig)}`);
      assert(rewardConfig.map(item => item.minWins).join('|') === REWARD_MILESTONES, `${viewport.name}: reward die round-win milestones changed ${JSON.stringify(rewardConfig)}`);
      assert(rewardConfigNames.join('|') === REWARD_BASE_NAMES.join('|'), `${viewport.name}: active reward ladder should use the expected base and VIP dice ${JSON.stringify(rewardConfig)}`);
      assert(rewardSpecials.length === 0 && REWARD_SPECIAL_NAMES.every(name => !rewardConfigNames.includes(name)), `${viewport.name}: parked branded reward dice should stay out of the active game ${JSON.stringify(rewardConfig)}`);
      assert(rewardMissingBaseNames.length === 0 && rewardConfig.every(item => item.sessionVariant === false && item.replacementFor === ''), `${viewport.name}: reward ladder should not replace base rungs while branded dice are parked ${JSON.stringify({ rewardConfig, rewardMissingBaseNames, rewardSpecials })}`);
      assert(rewardConfig.every(item => REWARD_EFFECTS_BY_NAME[item.name] === item.effect), `${viewport.name}: reward die pattern effects missing ${JSON.stringify(rewardConfig)}`);
      assert(rewardConfig.filter(item => REWARD_OUTLINED_BASE_NAMES.includes(item.name)).every(item => item.pipOutline === true), `${viewport.name}: outlined base reward dice should keep pip outlines ${JSON.stringify(rewardConfig)}`);
      const rewardSkinFixture = await evalValue(page, `(() => {
        const outlined = window.TrashDiceQA.rewardSkinFixture(${JSON.stringify((rewardConfig.find(item => item.pipOutline) || rewardFirst).minWins)});
        const animated = window.TrashDiceQA.rewardSkinFixture(${JSON.stringify((rewardConfig.find(item => rewardSlotAnimation(item.effect)) || rewardFirst).minWins)});
        window.TrashDiceQA.setRewardWins(2);
        return { outlined, animated };
      })()`);
      const outlinedConfig = rewardConfig.find(item => item.minWins === rewardSkinFixture.outlined.activePlayerDie.minWins) || rewardFirst;
      const animatedConfig = rewardConfig.find(item => item.minWins === rewardSkinFixture.animated.activePlayerDie.minWins) || rewardFirst;
      const playerRewardSlot = rewardSkinFixture.outlined.slots.find(slot => slot.player === 'p1');
      const cpuRewardSlot = rewardSkinFixture.outlined.slots.find(slot => slot.player === 'p2');
      const animatedRewardSlot = rewardSkinFixture.animated.slots.find(slot => slot.player === 'p1');
      assert(rewardSkinFixture.outlined.playerDie.rewardSkinned === true && rewardSkinFixture.outlined.playerDie.tier === String(outlinedConfig.tier) && rewardSkinFixture.outlined.playerDie.name === outlinedConfig.name, `${viewport.name}: earned reward skin should apply to the real player die ${JSON.stringify(rewardSkinFixture.outlined)}`);
      assert(rewardSkinFixture.outlined.cpuDie.rewardSkinned === false && rewardSkinFixture.outlined.cpuDie.tier === '', `${viewport.name}: reward skin should not apply to the CPU die ${JSON.stringify(rewardSkinFixture.outlined.cpuDie)}`);
      assert(playerRewardSlot && playerRewardSlot.rewardSkinned === true && playerRewardSlot.tier === String(outlinedConfig.tier) && playerRewardSlot.name === outlinedConfig.name && playerRewardSlot.pipOutline === String(!!outlinedConfig.pipOutline), `${viewport.name}: earned reward skin should apply to the player's seated lid die ${JSON.stringify(rewardSkinFixture.outlined.slots)}`);
      assert(animatedRewardSlot && animatedRewardSlot.tier === String(animatedConfig.tier) && animatedRewardSlot.name === animatedConfig.name && hasVisibleSeatedRewardAnimation(animatedRewardSlot), `${viewport.name}: animated seated reward die should keep visible multi-element live animation ${JSON.stringify({ animatedConfig, animatedRewardSlot })}`);
      assert(cpuRewardSlot && cpuRewardSlot.rewardSkinned === false && cpuRewardSlot.tier === '', `${viewport.name}: reward skin should not apply to the CPU seated lid die ${JSON.stringify(rewardSkinFixture.outlined.slots)}`);
      const rewardSkinGreenClassPips = await evalValue(page, `(() => {
        window.TrashDiceQA.rewardSkinFixture(2);
        const die = document.getElementById('p1Die');
        die.classList.remove('p1');
        die.classList.add('p2');
        const dot = die.querySelector('.dot');
        const dieStyle = getComputedStyle(die);
        const rewardPip = dieStyle.getPropertyValue('--reward-pip').trim();
        const probe = document.createElement('span');
        probe.style.color = rewardPip;
        document.body.appendChild(probe);
        const expected = getComputedStyle(probe).color;
        probe.remove();
        const result = {
          className: die.className,
          rewardPip,
          expected,
          computedDotBackground: dot ? getComputedStyle(dot).backgroundColor : '',
          activeDie: window.TrashDiceQA.rewardDieState().activeDie
        };
        window.TrashDiceQA.rewardSkinFixture(2);
        return result;
      })()`);
      assert(rewardSkinGreenClassPips.computedDotBackground === rewardSkinGreenClassPips.expected, `${viewport.name}: reward-skinned player die with collected green class should keep reward pip color ${JSON.stringify(rewardSkinGreenClassPips)}`);
      const rewardOutlinedPipCompositing = await evalValue(page, `(() => {
        const outlinedWins = ${JSON.stringify(rewardConfig.filter(item => item.pipOutline).map(item => item.minWins))};
        const previousDeviceProfile = document.body.dataset.deviceProfile;
        const previousGameStarted = document.body.dataset.gameStarted;
        const previousIpadClass = document.body.classList.contains('ipad-gameplay-performance');
        const hasSpreadOutlineShadow = value => /(?:^|,\\s*)(?:rgba?\\([^)]+\\)|#[0-9a-fA-F]+|[a-zA-Z]+)\\s+0px\\s+0px\\s+0px\\s+(?:[1-9]\\d*|0\\.[1-9]\\d*|[1-9]\\d*\\.\\d+)px/.test(value || '');
        const isTransparent = value => !value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)';
        const inspectPip = dot => {
          const cell = dot ? dot.closest('.dot-cell') : null;
          const style = dot ? getComputedStyle(dot) : null;
          const cellStyle = cell ? getComputedStyle(cell) : null;
          const clipPath = style ? [style.clipPath || '', style.webkitClipPath || ''].join(' ') : '';
          const boxShadow = style ? (style.boxShadow || '') : '';
          return {
            present: !!dot,
            backgroundClip: style ? style.backgroundClip || '' : '',
            borderTopWidth: style ? style.borderTopWidth || '' : '',
            borderTopStyle: style ? style.borderTopStyle || '' : '',
            borderTopColor: style ? style.borderTopColor || '' : '',
            borderRadius: style ? style.borderTopLeftRadius || '' : '',
            clipPath,
            filter: style ? style.filter || '' : '',
            boxShadow,
            outlineWidth: style ? (parseFloat(style.borderTopWidth || '0') || 0) : 0,
            circularClip: /circle/i.test(clipPath),
            shadowHasSpreadOutline: hasSpreadOutlineShadow(boxShadow),
            cellBackgroundColor: cellStyle ? cellStyle.backgroundColor || '' : '',
            cellBackgroundImage: cellStyle ? cellStyle.backgroundImage || '' : '',
            cellTransparent: !!cellStyle && isTransparent(cellStyle.backgroundColor || '') && (!cellStyle.backgroundImage || cellStyle.backgroundImage === 'none')
          };
        };
        const inspectTravelPip = travelState => {
          const dotStyle = travelState && travelState.dotStyle ? travelState.dotStyle : null;
          const cellStyle = travelState && travelState.dotCellStyle ? travelState.dotCellStyle : null;
          const clipPath = dotStyle ? [dotStyle.clipPath || '', dotStyle.webkitClipPath || ''].join(' ') : '';
          const boxShadow = dotStyle ? (dotStyle.boxShadow || '') : '';
          return {
            motionClass: travelState ? travelState.motionClass || '' : '',
            className: travelState ? travelState.className || '' : '',
            rewardSkinned: !!(travelState && travelState.rewardSkinned),
            effect: travelState ? travelState.effect || '' : '',
            backgroundClip: dotStyle ? dotStyle.backgroundClip || '' : '',
            borderTopWidth: dotStyle ? dotStyle.borderTopWidth || '' : '',
            borderTopStyle: dotStyle ? dotStyle.borderTopStyle || '' : '',
            borderTopColor: dotStyle ? dotStyle.borderTopColor || '' : '',
            borderRadius: dotStyle ? dotStyle.borderRadius || '' : '',
            clipPath,
            filter: dotStyle ? dotStyle.filter || '' : '',
            boxShadow,
            outlineWidth: dotStyle ? (parseFloat(dotStyle.borderTopWidth || '0') || 0) : 0,
            circularClip: /circle/i.test(clipPath),
            shadowHasSpreadOutline: hasSpreadOutlineShadow(boxShadow),
            cellBackgroundColor: cellStyle ? cellStyle.backgroundColor || '' : '',
            cellBackgroundImage: cellStyle ? cellStyle.backgroundImage || '' : '',
            cellTransparent: !!cellStyle && isTransparent(cellStyle.backgroundColor || '') && (!cellStyle.backgroundImage || cellStyle.backgroundImage === 'none')
          };
        };
        document.body.dataset.deviceProfile = 'ipad';
        document.body.dataset.gameStarted = 'true';
        document.body.classList.add('ipad-gameplay-performance');
        const results = outlinedWins.map(totalWins => {
          const fixture = window.TrashDiceQA.rewardSkinFixture(totalWins);
          const stage = document.getElementById('p1DieStage');
          const die = document.getElementById('p1Die');
          if (stage) stage.classList.add('active');
          if (die) die.classList.add('rolling', 'ipad-rolling');
          const live = inspectPip(die ? die.querySelector('.dot') : null);
          const travel = window.TrashDiceQA.rewardTravelCloneProbe(totalWins);
          return {
            totalWins,
            activeDie: fixture.activePlayerDie,
            live,
            toSlot: inspectTravelPip(travel && travel.toSlot),
            toTrash: inspectTravelPip(travel && travel.toTrash)
          };
        });
        if (typeof previousDeviceProfile === 'undefined') delete document.body.dataset.deviceProfile;
        else document.body.dataset.deviceProfile = previousDeviceProfile;
        if (typeof previousGameStarted === 'undefined') delete document.body.dataset.gameStarted;
        else document.body.dataset.gameStarted = previousGameStarted;
        document.body.classList.toggle('ipad-gameplay-performance', previousIpadClass);
        window.TrashDiceQA.rewardSkinFixture(2);
        return results;
      })()`);
      const rewardPipLooksCircular = pip =>
        pip && pip.present !== false &&
        pip.outlineWidth >= 1 &&
        pip.borderTopStyle === 'solid' &&
        /padding-box/i.test(pip.backgroundClip || '') &&
        pip.circularClip === true &&
        pip.shadowHasSpreadOutline === false &&
        pip.filter === 'none' &&
        pip.cellTransparent === true;
      const rewardOutlinedPipFailures = rewardOutlinedPipCompositing.flatMap(item => [
        { skin: item.activeDie && item.activeDie.name, location: 'live', pip: item.live },
        { skin: item.activeDie && item.activeDie.name, location: 'toSlot', pip: item.toSlot },
        { skin: item.activeDie && item.activeDie.name, location: 'toTrash', pip: item.toTrash }
      ].filter(entry => !rewardPipLooksCircular(entry.pip)));
      assert(rewardOutlinedPipFailures.length === 0, `${viewport.name}: iPad outlined reward pips should render as clipped circular borders without square shadow cells ${JSON.stringify(rewardOutlinedPipFailures)}`);
      const rewardSkinLadderFixtures = await evalValue(page, `(() => {
        const milestones = ${JSON.stringify(rewardConfig.map(item => item.minWins))};
        const fixtures = milestones.map(totalWins => window.TrashDiceQA.rewardSkinFixture(totalWins));
        window.TrashDiceQA.setRewardWins(2);
        return fixtures.map(fixture => ({
          activeName: fixture.activePlayerDie ? fixture.activePlayerDie.name : '',
          activeEffect: fixture.activePlayerDie ? fixture.activePlayerDie.effect : '',
          playerDie: fixture.playerDie,
          playerSlot: fixture.slots.find(slot => slot.player === 'p1')
        }));
      })()`);
      assert(rewardSkinLadderFixtures.map(item => item.activeName).join('|') === rewardConfigNames.join('|'), `${viewport.name}: all reward ladder skins should activate in active order ${JSON.stringify({ rewardConfig, rewardSkinLadderFixtures })}`);
      assert(rewardSkinLadderFixtures.every(item => item.playerDie.rewardSkinned === true && hasVisibleSeatedRewardAnimation(item)), `${viewport.name}: every reward skin should visibly animate on the player die and seated lid die ${JSON.stringify(rewardSkinLadderFixtures)}`);
      const prismHeroSpin = await evalValue(page, rewardHeroBodySpinProbeScript(rewardPrism.minWins, 3, viewport.mobile ? 900 : 1100, viewport.mobile ? 32 : 40));
      const expectedPrismHeroRollAnimation = viewport.mobile ? 'rewardDieRollMobile' : 'rewardDieRoll';
      assert(prismHeroSpin.firstActive && prismHeroSpin.firstActive.rewardSkinned === true && prismHeroSpin.firstActive.effect === rewardPrism.effect, `${viewport.name}: PRISM hero roll probe did not activate the PRISM reward die ${JSON.stringify({ rewardPrism, prismHeroSpin })}`);
      assert(prismHeroSpin.animationNames.includes(expectedPrismHeroRollAnimation), `${viewport.name}: PRISM hero die should use the platform reward roll animation, not only the prism pip/face cycle ${JSON.stringify({ expectedPrismHeroRollAnimation, prismHeroSpin })}`);
      assert(prismHeroSpin.activeSamples >= 2 && prismHeroSpin.rollKeyframeTransformCount >= 2 && (prismHeroSpin.uniqueTransformCount >= 2 || prismHeroSpin.rollAnimationCurrentTimeDelta >= 40), `${viewport.name}: PRISM reward hero die body should visibly spin during roll ${JSON.stringify(prismHeroSpin)}`);
      const liveRewardDieEdge = await evalValue(page, `(() => {
        const fixture = window.TrashDiceQA.rewardSkinFixture(${JSON.stringify(rewardCapDie.minWins)});
        const stage = document.getElementById('p1DieStage');
        const die = document.getElementById('p1Die');
        if (stage) stage.classList.add('active');
        let spin = null;
        if (die) {
          die.classList.add('rolling');
          const spinStyle = getComputedStyle(die);
          const spinRect = die.getBoundingClientRect();
          spin = {
            className: die.className,
            animationName: spinStyle.animationName,
            borderRadius: spinStyle.borderTopLeftRadius,
            clipPath: spinStyle.clipPath || '',
            webkitClipPath: spinStyle.webkitClipPath || '',
            overflow: spinStyle.overflow,
            webkitMaskImage: spinStyle.webkitMaskImage || '',
            maskImage: spinStyle.maskImage || '',
            boxShadow: spinStyle.boxShadow,
            filter: spinStyle.filter || '',
            rect: spinRect ? { width: spinRect.width, height: spinRect.height } : null
          };
          die.classList.remove('rolling');
          die.classList.add('roll-resolved');
        }
        const style = die ? getComputedStyle(die) : null;
        const before = die ? getComputedStyle(die, '::before') : null;
        const stageShadow = stage ? getComputedStyle(stage, '::before') : null;
        const stageDepth = stage ? getComputedStyle(stage, '::after') : null;
        const rect = die ? die.getBoundingClientRect() : null;
        const slot = document.querySelector('.slot-die.reward-skinned');
        const depthOpacity = stageDepth ? Number.parseFloat(stageDepth.opacity || '0') : 0;
        const result = {
          fixture,
          className: die ? die.className : '',
          stageClass: stage ? stage.className : '',
          rewardSkinned: !!(die && die.classList.contains('reward-skinned')),
          effect: die ? die.dataset.rewardEffect || '' : '',
          borderRadius: style ? style.borderTopLeftRadius : '',
          backgroundClip: style ? style.backgroundClip : '',
          clipPath: style ? style.clipPath || '' : '',
          webkitClipPath: style ? style.webkitClipPath || '' : '',
          overflow: style ? style.overflow : '',
          webkitMaskImage: style ? style.webkitMaskImage || '' : '',
          maskImage: style ? style.maskImage || '' : '',
          boxShadow: style ? style.boxShadow : '',
          filter: style ? style.filter : '',
          beforeTransform: before ? before.transform : '',
          stageShadowAnimationName: stageShadow ? stageShadow.animationName : '',
          stageShadowTransform: stageShadow ? stageShadow.transform : '',
          stageShadowOpacity: stageShadow ? stageShadow.opacity : '',
          stageShadowBackground: stageShadow ? [stageShadow.backgroundImage, stageShadow.backgroundColor].join(' ').trim() : '',
          stageDepthContent: stageDepth ? stageDepth.content : '',
          stageDepthOpacity: stageDepth ? stageDepth.opacity : '',
          stageDepthSoftEnough: depthOpacity > 0 && depthOpacity <= 0.45,
          stageDepthBoxShadow: stageDepth ? stageDepth.boxShadow : '',
          stageDepthTransform: stageDepth ? stageDepth.transform : '',
          stageDepthBackground: stageDepth ? [stageDepth.backgroundImage, stageDepth.backgroundColor].join(' ').trim() : '',
          spin,
          rect: rect ? { width: rect.width, height: rect.height } : null,
          seatedRewardStillSvg: !!slot,
          seatedRewardEffect: slot ? slot.dataset.rewardEffect || '' : ''
        };
        if (stage) stage.classList.remove('active');
        window.TrashDiceQA.setRewardWins(2);
        return result;
      })()`);
      assert(liveRewardDieEdge.spin && /rewardDieRoll/.test(liveRewardDieEdge.spin.animationName || ''), `${viewport.name}: reward hero spin should use reward-specific shape-preserving animation ${JSON.stringify(liveRewardDieEdge)}`);
      assert(liveRewardDieEdge.stageShadowAnimationName === 'none' && liveRewardDieEdge.stageShadowTransform === 'none' && Number.parseFloat(liveRewardDieEdge.stageShadowOpacity || '0') <= 0.5 && !/conic-gradient/i.test(liveRewardDieEdge.stageShadowBackground || ''), `${viewport.name}: DISCO rolling die stage shadow should stay attached instead of using the lagging projector layer ${JSON.stringify(liveRewardDieEdge)}`);
      if (viewport.mobile) {
        const radiusValue = parseFloat(liveRewardDieEdge.borderRadius || '0');
        const radiusIsPercent = String(liveRewardDieEdge.borderRadius || '').includes('%');
        const spinRadiusValue = parseFloat((liveRewardDieEdge.spin && liveRewardDieEdge.spin.borderRadius) || '0');
        const spinRadiusIsPercent = String((liveRewardDieEdge.spin && liveRewardDieEdge.spin.borderRadius) || '').includes('%');
        assert(liveRewardDieEdge.rewardSkinned === true && liveRewardDieEdge.effect === rewardCapDie.effect, `${viewport.name}: mobile live reward die probe did not activate cap skin ${JSON.stringify({ rewardCapDie, liveRewardDieEdge })}`);
        assert(radiusIsPercent ? radiusValue >= 21 && radiusValue <= 23 : (liveRewardDieEdge.rect && radiusValue >= liveRewardDieEdge.rect.width * 0.21 && radiusValue <= liveRewardDieEdge.rect.width * 0.23), `${viewport.name}: mobile live reward die should match the default die corner shape ${JSON.stringify(liveRewardDieEdge)}`);
        assert(spinRadiusIsPercent ? spinRadiusValue >= 21 && spinRadiusValue <= 23 : (liveRewardDieEdge.spin.rect && spinRadiusValue >= liveRewardDieEdge.spin.rect.width * 0.21 && spinRadiusValue <= liveRewardDieEdge.spin.rect.width * 0.23), `${viewport.name}: mobile reward hero spin should keep the default die silhouette ${JSON.stringify(liveRewardDieEdge.spin)}`);
        assert(liveRewardDieEdge.spin.animationName === 'rewardDieRollMobile', `${viewport.name}: mobile reward hero spin should avoid the generic squashing roll keyframes ${JSON.stringify(liveRewardDieEdge.spin)}`);
        assert(/round/i.test(liveRewardDieEdge.clipPath || liveRewardDieEdge.webkitClipPath || '') && /round/i.test(liveRewardDieEdge.spin.clipPath || liveRewardDieEdge.spin.webkitClipPath || ''), `${viewport.name}: mobile reward hero die should use a hard rounded clip to prevent square compositing during spin ${JSON.stringify(liveRewardDieEdge)}`);
        assert(liveRewardDieEdge.webkitMaskImage === 'none' && liveRewardDieEdge.maskImage === 'none', `${viewport.name}: mobile live reward die should not mask away the external 3D backing ${JSON.stringify(liveRewardDieEdge)}`);
        assert(liveRewardDieEdge.overflow === 'hidden' && liveRewardDieEdge.boxShadow.includes('inset') && liveRewardDieEdge.beforeTransform !== 'none', `${viewport.name}: mobile live reward die should keep physical hero depth and clipped skin treatment ${JSON.stringify(liveRewardDieEdge)}`);
        if (viewport.width <= 720) {
          assert(!/drop-shadow/i.test(liveRewardDieEdge.filter || '') && !/drop-shadow/i.test((liveRewardDieEdge.spin && liveRewardDieEdge.spin.filter) || ''), `${viewport.name}: phone live reward die should avoid CSS filter drop-shadows that rasterize as a panel on mobile Safari ${JSON.stringify(liveRewardDieEdge)}`);
          assert(!liveRewardDieEdge.boxShadow.includes('13px 14px') && liveRewardDieEdge.boxShadow.includes('8px 9px'), `${viewport.name}: phone live reward die should use a tighter attached mobile skin shadow ${JSON.stringify(liveRewardDieEdge)}`);
          assert(liveRewardDieEdge.stageDepthContent === 'none' && Number.parseFloat(liveRewardDieEdge.stageDepthOpacity || '0') === 0 && liveRewardDieEdge.stageDepthBoxShadow === 'none' && liveRewardDieEdge.stageDepthTransform === 'none', `${viewport.name}: phone live reward die should disable the separate panel-sized depth backing ${JSON.stringify(liveRewardDieEdge)}`);
        }
      }
      assert(liveRewardDieEdge.seatedRewardStillSvg === true && liveRewardDieEdge.seatedRewardEffect === rewardCapDie.effect, `${viewport.name}: live reward die edge probe should not remove seated reward dice ${JSON.stringify({ rewardCapDie, liveRewardDieEdge })}`);
      const travellingRewardDieEdge = await evalValue(page, `window.TrashDiceQA.rewardTravelCloneProbe(${JSON.stringify(rewardCapDie.minWins)})`);
      const prismTravellingRewardDieMotion = await evalValue(page, `window.TrashDiceQA.rewardTravelCloneProbe(${JSON.stringify(rewardPrism.minWins)})`);
      const expectedPrismToSlotAnimation = viewport.mobile ? 'dieArcToLidMobile' : 'dieArcToLid';
      const expectedPrismToTrashAnimation = viewport.mobile ? 'dieArcToCanMobile' : 'dieArcToCan';
      assert(prismTravellingRewardDieMotion.toSlot.rewardSkinned === true && prismTravellingRewardDieMotion.toSlot.effect === rewardPrism.effect, `${viewport.name}: PRISM travelling-to-lid clone did not activate PRISM skin ${JSON.stringify({ rewardPrism, prismTravellingRewardDieMotion })}`);
      assert(prismTravellingRewardDieMotion.toTrash.rewardSkinned === true && prismTravellingRewardDieMotion.toTrash.effect === rewardPrism.effect, `${viewport.name}: PRISM travelling-to-trash clone did not activate PRISM skin ${JSON.stringify({ rewardPrism, prismTravellingRewardDieMotion })}`);
      assert((prismTravellingRewardDieMotion.toSlot.animationName || '').includes(expectedPrismToSlotAnimation) && !(prismTravellingRewardDieMotion.toSlot.animationName || '').includes('rewardPrismCycle'), `${viewport.name}: PRISM travelling-to-lid clone should run the lid arc, not the idle prism cycle ${JSON.stringify({ expectedPrismToSlotAnimation, prismTravellingRewardDieMotion })}`);
      assert((prismTravellingRewardDieMotion.toTrash.animationName || '').includes(expectedPrismToTrashAnimation) && !(prismTravellingRewardDieMotion.toTrash.animationName || '').includes('rewardPrismCycle'), `${viewport.name}: PRISM travelling-to-trash clone should run the trash arc, not the idle prism cycle ${JSON.stringify({ expectedPrismToTrashAnimation, prismTravellingRewardDieMotion })}`);
      if (viewport.mobile) {
        for (const travelState of [travellingRewardDieEdge.toSlot, travellingRewardDieEdge.toTrash]) {
          const radiusValue = parseFloat(travelState.borderRadius || '0');
          const radiusIsPercent = String(travelState.borderRadius || '').includes('%');
          assert(travelState.rewardSkinned === true && travelState.effect === rewardCapDie.effect, `${viewport.name}: travelling reward die probe did not activate cap skin ${JSON.stringify({ rewardCapDie, travellingRewardDieEdge })}`);
          assert(radiusIsPercent ? radiusValue >= 21 && radiusValue <= 23 : (travelState.rect && radiusValue >= travelState.rect.width * 0.21 && radiusValue <= travelState.rect.width * 0.23), `${viewport.name}: travelling reward die should match the default die corner shape ${JSON.stringify(travelState)}`);
          assert(/round/i.test(travelState.clipPath || travelState.webkitClipPath || ''), `${viewport.name}: travelling reward die should use the same hard rounded clip as the live hero die ${JSON.stringify(travelState)}`);
          assert(/padding-box/i.test(travelState.backgroundClip || ''), `${viewport.name}: travelling reward die should clip reward face to padding box ${JSON.stringify(travelState)}`);
          assert(travelState.webkitMaskImage === 'none' && travelState.maskImage === 'none', `${viewport.name}: travelling reward die should not mask away the external 3D backing ${JSON.stringify(travelState)}`);
          assert(travelState.overflow === 'hidden' && travelState.boxShadow.includes('inset') && travelState.beforeTransform !== 'none' && travelState.afterTransform !== 'none', `${viewport.name}: travelling reward die pseudo layers should stay clipped while the object keeps physical depth ${JSON.stringify(travelState)}`);
          const expectedTravelDotCss = viewport.width <= 720 ? 24 : ((travelState.rect && travelState.rect.width >= 300) ? 58 : 20);
          assert(travelState.className.includes('hero-travel-scale') && travelState.dotCssMaxWidth >= expectedTravelDotCss, `${viewport.name}: travelling reward die should inherit hero-stage pip sizing ${JSON.stringify(travelState)}`);
          if (viewport.width <= 720) {
            assert(travelState.filter === 'none' && !travelState.boxShadow.includes('9px 10px') && travelState.boxShadow.includes('6px 7px'), `${viewport.name}: phone travelling reward die should use attached box-shadows instead of a CSS filter drop-shadow ${JSON.stringify(travelState)}`);
          }
        }
      }
      await evalValue(page, `window.TrashDiceQA.gameWin('p1'); true`);
      await waitEval(page, `window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active`, `${viewport.name} game complete`);
      await sleep(760);
      const terminalWindup = await evalValue(page, `window.TrashDiceQA.roundWinsWindupState()`);
      const expectedWindupFirstTickDelay = viewport.mobile ? GAME_WIN_ROUND_WINS_FIRST_TICK_DELAY_MIN_MS.mobile : GAME_WIN_ROUND_WINS_FIRST_TICK_DELAY_MIN_MS.desktop;
      assert(terminalWindup.present === true && terminalWindup.visible === true && terminalWindup.label === 'ROUNDS WON:' && terminalWindup.count === 'x1' && terminalWindup.finalWins === 2 && terminalWindup.currentWins === 1 && terminalWindup.gameLabel === 'GAMES WON:' && terminalWindup.finalGameWins >= 1 && terminalWindup.currentGameWins >= 1 && terminalWindup.gameCount === String(terminalWindup.currentGameWins) && terminalWindup.complete === false && terminalWindup.startWins === 1 && terminalWindup.firstTickDelayMs >= expectedWindupFirstTickDelay && terminalWindup.className.includes('is-winding'), `${viewport.name}: game-win counters should visibly hold before winding up ${JSON.stringify(terminalWindup)}`);
      if (viewport.mobile) {
        assert(terminalWindup.opacity >= 0.85 && terminalWindup.countAnimationName.includes('inlineRoundWinsTick') && terminalWindup.haloAnimationName.includes('inlineRoundWinsChipHalo'), `${viewport.name}: mobile/tablet round counter should visibly hold and shimmer before ticking ${JSON.stringify(terminalWindup)}`);
      }
      await sleep(1700);
      const terminal = await evalValue(page, `(() => ({
        stillComplete: !!(window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active),
        pwaVisible: !!document.querySelector('#pwaInstallCard.is-visible'),
        titleFanfare: document.getElementById('heroTitle').classList.contains('round-win-title-fanfare') || document.getElementById('heroTitle').classList.contains('round-win-title-sustain'),
        winnerPanel: document.getElementById('p1Inventory').closest('.player-panel').classList.contains('player-payout-fanfare'),
        winnerPile: document.getElementById('p1Inventory').classList.contains('player-payout-fanfare'),
        winnerPraise: document.getElementById('p1StatusBar').classList.contains('payout-praise'),
        winnerStatusLarge: document.getElementById('p1StatusBar').classList.contains('round-winner-praise'),
        winnerStatusFontSize: getComputedStyle(document.getElementById('p1StatusBar')).fontSize,
        winnerLabel: (document.getElementById('p1StatusText') || {}).textContent || '',
        winnerStatusChaseDie: (() => {
          const bar = document.getElementById('p1StatusBar');
          const die = document.getElementById('p1StatusChaseDie');
          if (!bar || !die) return { present: false };
          const r = die.getBoundingClientRect();
          const br = bar.getBoundingClientRect();
          const style = getComputedStyle(die);
          return {
            present: true,
            visible: bar.classList.contains('has-chase-die') && !die.hidden && style.display !== 'none' && r.width >= 28 && r.height >= 28,
            name: die.dataset.rewardName || '',
            effect: die.dataset.rewardEffect || '',
            fitsStatus: r.left >= br.left - 1 && r.right <= br.right + 1 && r.top >= br.top - 1 && r.bottom <= br.bottom + 1,
            rect: { width: Math.round(r.width), height: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right) },
            barRect: { width: Math.round(br.width), height: Math.round(br.height), left: Math.round(br.left), right: Math.round(br.right) }
          };
        })(),
        winnerCount: document.getElementById('p1Pool').classList.contains('payout-jackpot'),
        trashedStamp: (() => {
          const stamp = document.getElementById('p2TrashedStamp');
          if (!stamp) return { present: false };
          const r = stamp.getBoundingClientRect();
          const panel = stamp.closest('.player-panel');
          const pr = panel ? panel.getBoundingClientRect() : null;
          const style = getComputedStyle(stamp);
          return {
            present: true,
            text: stamp.textContent || '',
            visible: style.visibility !== 'hidden' && parseFloat(style.opacity || '0') > 0.9 && r.width > 0 && r.height > 0,
            fitsViewport: r.left >= -1 && r.right <= window.innerWidth + 1 && r.top >= -1 && r.bottom <= window.innerHeight + 1,
            fitsPanel: !!pr && r.left >= pr.left -1 && r.right <= pr.right + 1 && r.top >= pr.top -1 && r.bottom <= pr.bottom + 1,
            rect: { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) },
            panelRect: pr ? { left: Math.round(pr.left), right: Math.round(pr.right), top: Math.round(pr.top), bottom: Math.round(pr.bottom), width: Math.round(pr.width), height: Math.round(pr.height) } : null
          };
        })(),
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
        outcomeCard: (() => {
          const card = document.getElementById('inlineResultBanner');
          const title = document.getElementById('inlineResultTitle');
          const sub = document.getElementById('inlineResultSub');
          const chip = document.getElementById('inlineResultChip');
          const chipText = document.getElementById('inlineResultChipText');
          const chipLabel = chip ? chip.querySelector('.inline-result-chip-label') : null;
          const chipCount = chip ? chip.querySelector('.inline-result-chip-count') : null;
          const chipGameLabel = chip ? chip.querySelector('.inline-result-chip-game .inline-result-chip-label') : null;
          const chipGameCount = chip ? chip.querySelector('.inline-result-chip-game .inline-result-chip-count') : null;
          const btn = document.getElementById('rollBtn');
          if (!card || !title || !sub || !chip || !chipText || !btn) return { present: false };
          const r = card.getBoundingClientRect();
          const br = btn.getBoundingClientRect();
          const style = getComputedStyle(card);
          const titleStyle = getComputedStyle(title);
          const subStyle = getComputedStyle(sub);
          const chipStyle = getComputedStyle(chip);
          const chipCountStyle = chipCount ? getComputedStyle(chipCount) : null;
          const chipGameCountStyle = chipGameCount ? getComputedStyle(chipGameCount) : null;
          const chipRect = chip.getBoundingClientRect();
          const edgeStyle = getComputedStyle(card, '::before');
          const sparkStyle = getComputedStyle(card, '::after');
          return {
            present: true,
            visible: style.visibility !== 'hidden' && parseFloat(style.opacity || '0') > 0.9 && r.width >= 240 && r.height >= 120,
            title: title.textContent.replace(/\s+/g, ' ').trim(),
            sub: sub.textContent.replace(/\s+/g, ' ').trim(),
            subHidden: !!sub.hidden || sub.getAttribute('aria-hidden') === 'true',
            subDisplay: subStyle.display,
            backgroundImage: style.backgroundImage,
            titleColor: titleStyle.color,
            animationName: style.animationName,
            subAnimationName: subStyle.animationName,
            edgeAnimationName: edgeStyle.animationName,
            sparkAnimationName: sparkStyle.animationName,
            chip: {
              visible: !chip.hidden && chipStyle.display !== 'none' && chipRect.width >= 90 && chipRect.height >= 22,
              text: chipText.textContent.replace(/\s+/g, ' ').trim(),
              label: chipLabel ? chipLabel.textContent.replace(/\s+/g, ' ').trim() : '',
              count: chipCount ? chipCount.textContent.replace(/\s+/g, ' ').trim() : '',
              gameLabel: chipGameLabel ? chipGameLabel.textContent.replace(/\s+/g, ' ').trim() : '',
              gameCount: chipGameCount ? chipGameCount.textContent.replace(/\s+/g, ' ').trim() : '',
              animationName: chipStyle.animationName,
              className: chip.className,
              roundWins: Number(chip.dataset.roundWins || 0),
              windupCurrent: Number(chip.dataset.windupCurrent || 0),
              gameWins: Number(chip.dataset.gameWins || 0),
              gameWinsCurrent: Number(chip.dataset.gameWinsCurrent || 0),
              windupComplete: chip.dataset.windupComplete === 'true',
              windupTicks: Number(chip.dataset.windupTicks || 0),
              windupStep: Number(chip.dataset.windupStep || 0),
              firstTickDelayMs: Number(chip.dataset.windupFirstTickDelayMs || 0),
              tickMs: Number(chip.dataset.windupTickMs || 0),
              countMinWidth: chipCount ? getComputedStyle(chipCount).minWidth : '',
              gameCountMinWidth: chipGameCountStyle ? chipGameCountStyle.minWidth : '',
              fontSize: chipStyle.fontSize,
              countFontSize: chipCountStyle ? chipCountStyle.fontSize : '',
              gameCountFontSize: chipGameCountStyle ? chipGameCountStyle.fontSize : '',
              rect: { left: Math.round(chipRect.left), right: Math.round(chipRect.right), top: Math.round(chipRect.top), bottom: Math.round(chipRect.bottom), width: Math.round(chipRect.width), height: Math.round(chipRect.height) }
            },
            fitsViewport: r.left >= -1 && r.right <= window.innerWidth + 1 && r.top >= -1 && r.bottom <= window.innerHeight + 1,
            clearsPlayAgain: r.bottom <= br.top + 2,
            rect: { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) },
            playAgainRect: { top: Math.round(br.top), bottom: Math.round(br.bottom), width: Math.round(br.width), height: Math.round(br.height) }
          };
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
        rewardDie: (() => {
          const shell = document.getElementById('rewardDieUnlock');
          const die = document.getElementById('rewardDie');
          const name = document.getElementById('rewardDieName');
          const sub = document.getElementById('rewardDieSub');
          if (!shell || !die || !name || !sub) return { present: false };
          const r = die.getBoundingClientRect();
          const shellStyle = getComputedStyle(shell);
          const dieStyle = getComputedStyle(die);
          return {
            present: true,
            visible: !shell.hidden && shell.classList.contains('show') && shellStyle.display !== 'none' && parseFloat(shellStyle.opacity || '0') > 0.9 && r.width >= 48 && r.height >= 48,
            tier: shell.dataset.tier || die.dataset.tier || '',
            effect: shell.dataset.effect || die.dataset.effect || '',
            name: name.textContent || '',
            sub: sub.textContent || '',
            pipCount: die.querySelectorAll('.reward-die-pip-cell.is-on .reward-die-pip').length,
            pipOutline: shell.dataset.pipOutline || die.dataset.pipOutline || '',
            faceColor: dieStyle.getPropertyValue('--reward-face').trim(),
            pipColor: dieStyle.getPropertyValue('--reward-pip').trim(),
            pipOutlineColor: dieStyle.getPropertyValue('--reward-pip-outline').trim(),
            state: window.TrashDiceQA.rewardDieState(),
            rect: { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) }
          };
        })(),
        roundWinBurst: (() => {
          const burst = document.getElementById('roundWinBurst');
          if (!burst) return { present: false };
          const r = burst.getBoundingClientRect();
          const style = getComputedStyle(burst);
          return {
            present: true,
            visible: !burst.hidden && burst.classList.contains('show') && style.display !== 'none' && parseFloat(style.opacity || '0') > 0.1 && r.width > 0 && r.height > 0,
            text: burst.textContent.replace(/\s+/g, ' ').trim(),
            rect: { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) }
          };
        })(),
        terminalRewardNudge: (() => {
          const nudge = document.getElementById('terminalRewardNudge');
          const die = document.getElementById('terminalRewardNudgeDie');
          const line = document.getElementById('terminalRewardNudgeLine');
          const unlock = document.getElementById('terminalRewardNudgeUnlock');
          const kicker = document.getElementById('terminalRewardNudgeKicker');
          const btn = document.getElementById('rollBtn');
          const panel = document.getElementById('p1Inventory') ? document.getElementById('p1Inventory').closest('.player-panel') : null;
          if (!nudge || !die || !line || !unlock || !kicker || !btn) return { present: false };
          const r = nudge.getBoundingClientRect();
          const dieRect = die.getBoundingClientRect();
          const dieStyle = getComputedStyle(die);
          const style = getComputedStyle(nudge);
          const beforeStyle = getComputedStyle(nudge, '::before');
          const afterStyle = getComputedStyle(nudge, '::after');
          const unlockStyle = getComputedStyle(unlock);
          const btnRect = btn.getBoundingClientRect();
          const panelRect = panel ? panel.getBoundingClientRect() : null;
          const overlaps = (a, b) => !!(a && b && a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1);
          const centerDeltaY = panelRect
            ? Math.abs((r.top + r.bottom) / 2 - (panelRect.top + panelRect.bottom) / 2)
            : Infinity;
          return {
            present: true,
            visible: !nudge.hidden && style.display !== 'none' && r.width >= 120 && r.height >= 28,
            text: nudge.textContent.replace(/\s+/g, ' ').trim(),
            line: line.textContent || '',
            unlockLine: unlock.textContent || '',
            kicker: kicker.textContent || '',
            nextName: nudge.dataset.nextName || '',
            roundsNeeded: nudge.dataset.roundsNeeded || '',
            targetWins: nudge.dataset.targetWins || '',
            copyMode: nudge.dataset.copyMode || '',
            preview: nudge.dataset.preview || '',
            dieRewardSkinned: die.classList.contains('reward-skinned'),
            dieName: die.dataset.rewardName || '',
            dieEffect: die.dataset.rewardEffect || '',
            diePipColor: dieStyle.getPropertyValue('--reward-pip').trim(),
            dieBorderRadius: dieStyle.borderTopLeftRadius || '',
            dieBackgroundClip: dieStyle.backgroundClip || '',
            dieClipPath: dieStyle.clipPath || '',
            dieWebkitClipPath: dieStyle.webkitClipPath || '',
            dieOverflow: dieStyle.overflow || '',
            dieWebkitMaskImage: dieStyle.webkitMaskImage || '',
            dieMaskImage: dieStyle.maskImage || '',
            animationName: style.animationName || '',
            beforeAnimationName: beforeStyle.animationName || '',
            afterAnimationName: afterStyle.animationName || '',
            dieAnimationName: dieStyle.animationName || '',
            unlockAnimationName: unlockStyle.animationName || '',
            layout: nudge.dataset.layout || '',
            rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) },
            playerPanelRect: panelRect ? { left: Math.round(panelRect.left), right: Math.round(panelRect.right), width: Math.round(panelRect.width), height: Math.round(panelRect.height), top: Math.round(panelRect.top), bottom: Math.round(panelRect.bottom) } : null,
            dieRect: { width: Math.round(dieRect.width), height: Math.round(dieRect.height) },
            abovePlayAgain: r.bottom <= btnRect.top + 2,
            overlapsPlayAgain: overlaps(r, btnRect),
            dockedToPlayerPanel: !!(panelRect && r.left >= panelRect.left - 36 && r.right <= panelRect.right + 36 && centerDeltaY <= Math.max(24, panelRect.height * 0.48)),
            fitsViewport: r.left >= -1 && r.right <= window.innerWidth + 1 && r.top >= -1 && r.bottom <= window.innerHeight + 1
          };
        })(),
        activeAnimationCount: document.getAnimations().filter(animation => animation.playState === 'running').length,
        events: window.TrashDiceAnalyticsDebug.log.map(item => item.eventName)
      }))()`);
      assert(terminal.stillComplete, `${viewport.name}: game over auto-reset unexpectedly`);
      assert(terminal.pwaVisible === false, `${viewport.name}: PWA hint became visible`);
      assert(terminal.titleFanfare === true, `${viewport.name}: title fanfare missing on player game win ${JSON.stringify(terminal)}`);
      assert(terminal.outcomeCard.present === true && terminal.outcomeCard.visible === true && terminal.outcomeCard.title === 'YOU TRASHED THE CPU!' && terminal.outcomeCard.sub === '' && terminal.outcomeCard.subHidden === true && terminal.outcomeCard.subDisplay === 'none', `${viewport.name}: game-win outcome card should remove the CPU cannot come back subline ${JSON.stringify(terminal.outcomeCard)}`);
      assert(/245,\s*200,\s*0|255,\s*248,\s*171|229,\s*173,\s*0/.test(terminal.outcomeCard.backgroundImage) && /11,\s*92,\s*49|8,\s*99,\s*53/.test(terminal.outcomeCard.titleColor), `${viewport.name}: game-win outcome card should use the inverted prize color treatment ${JSON.stringify(terminal.outcomeCard)}`);
      assert(terminal.outcomeCard.animationName.includes('terminalWinStamp') && terminal.outcomeCard.edgeAnimationName.includes('terminalWinEdgeFlash') && terminal.outcomeCard.sparkAnimationName.includes('terminalWinDiceSpark'), `${viewport.name}: game-win outcome card should use the slam, edge flash, and dice sparkle beats ${JSON.stringify(terminal.outcomeCard)}`);
      assert(terminal.outcomeCard.chip.visible === true && terminal.outcomeCard.chip.label === 'ROUNDS WON:' && terminal.outcomeCard.chip.count === 'x2' && terminal.outcomeCard.chip.gameLabel === 'GAMES WON:' && terminal.outcomeCard.chip.gameWins >= 1 && terminal.outcomeCard.chip.gameWinsCurrent === terminal.outcomeCard.chip.gameWins && terminal.outcomeCard.chip.gameCount === String(terminal.outcomeCard.chip.gameWins) && /ROUNDS WON:\s*x2/.test(terminal.outcomeCard.chip.text) && /GAMES WON:\s*\d+/.test(terminal.outcomeCard.chip.text) && terminal.outcomeCard.chip.windupComplete === true && terminal.outcomeCard.chip.windupTicks >= 1 && terminal.outcomeCard.chip.roundWins === 2 && terminal.outcomeCard.chip.windupCurrent === 2 && terminal.outcomeCard.chip.firstTickDelayMs >= expectedWindupFirstTickDelay && terminal.outcomeCard.chip.tickMs >= (viewport.mobile ? GAME_WIN_ROUND_WINS_TICK_MIN_MS.mobile : GAME_WIN_ROUND_WINS_TICK_MIN_MS.desktop) && parseFloat(terminal.outcomeCard.chip.fontSize || '0') >= (viewport.mobile ? 16 : 28) && parseFloat(terminal.outcomeCard.chip.countFontSize || '0') >= (viewport.mobile ? 26 : 44) && !terminal.outcomeCard.chip.text.includes('DICE SECURED') && terminal.outcomeCard.chip.animationName.includes('terminalWinSubPop'), `${viewport.name}: game-win outcome card should include round and game wins arcade wind-up counters inside the card ${JSON.stringify(terminal.outcomeCard.chip)}`);
      assert(terminal.outcomeCard.fitsViewport === true && terminal.outcomeCard.clearsPlayAgain === true, `${viewport.name}: game-win outcome card should fit above Keep Playing ${JSON.stringify(terminal.outcomeCard)}`);
      assert(terminal.roundWinBurst.present === true && terminal.roundWinBurst.visible === false, `${viewport.name}: game-win card should not stack on top of the round-win burst ${JSON.stringify(terminal.roundWinBurst)}`);
      assert(terminal.winnerPanel === true && terminal.winnerPile === true && terminal.winnerPraise === true, `${viewport.name}: player game-win should reuse the round-win lower panel celebration ${JSON.stringify(terminal)}`);
      assert(terminal.winnerStatusLarge === true && parseFloat(terminal.winnerStatusFontSize || '0') >= 14, `${viewport.name}: game-win lower status should read as a final winner badge ${JSON.stringify(terminal)}`);
      assert(terminal.winnerLabel === 'GAME WINNER!', `${viewport.name}: game-win lower status should use game winner copy ${JSON.stringify(terminal)}`);
      assert(terminal.winnerStatusChaseDie.present === true && terminal.winnerStatusChaseDie.visible === false, `${viewport.name}: game-win chase die belongs in the reward nudge, not the lower status pill ${JSON.stringify({ rewardNextAfterTwo, winnerStatusChaseDie: terminal.winnerStatusChaseDie })}`);
      assert(terminal.winnerCount === true, `${viewport.name}: game-win should pulse the player count as part of the final round-win family ${JSON.stringify(terminal)}`);
      assert(terminal.trashedStamp.present === true && terminal.trashedStamp.text === 'TRASHED!' && terminal.trashedStamp.visible === false, `${viewport.name}: TRASHED stamp should stay hidden on the ordered game-win screen ${JSON.stringify(terminal.trashedStamp)}`);
      assert(terminal.celebratingDice > 0, `${viewport.name}: looping dice celebration missing ${JSON.stringify(terminal)}`);
      assert(terminal.bodyFits, `${viewport.name}: win screen creates horizontal overflow ${JSON.stringify(terminal)}`);
      assert(terminal.playAgain.text.includes('KEEP PLAYING!'), `${viewport.name}: Keep Playing CTA missing ${JSON.stringify(terminal)}`);
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
      assert(terminal.rewardDie.present === true && terminal.rewardDie.visible === false, `${viewport.name}: game win should not trigger a separate reward unlock after round-win migration ${JSON.stringify(terminal.rewardDie)}`);
      assert(terminal.rewardDie.state.totalWins === 2 && terminal.rewardDie.state.activeTier === rewardAtTwo.tier && terminal.rewardDie.state.activeName === rewardAtTwo.name && terminal.rewardDie.state.nextDie && terminal.rewardDie.state.nextDie.name === rewardNextAfterTwo.name, `${viewport.name}: game win should preserve round-win reward state without double-counting ${JSON.stringify({ rewardAtTwo, rewardNextAfterTwo, state: terminal.rewardDie.state })}`);
      assert(terminal.terminalRewardNudge.present === true && terminal.terminalRewardNudge.visible === true, `${viewport.name}: terminal reward nudge missing ${JSON.stringify(terminal.terminalRewardNudge)}`);
      assert(terminal.terminalRewardNudge.kicker === `CURRENT SKIN: ${rewardAtTwo.name}` && terminal.terminalRewardNudge.line === `NEXT SKIN IN ${rewardNextAfterTwo.minWins - 2} ROUND WIN:` && terminal.terminalRewardNudge.unlockLine === rewardNextAfterTwo.name, `${viewport.name}: terminal reward nudge copy wrong ${JSON.stringify({ rewardAtTwo, rewardNextAfterTwo, terminalRewardNudge: terminal.terminalRewardNudge })}`);
      assert(terminal.terminalRewardNudge.nextName === rewardNextAfterTwo.name && terminal.terminalRewardNudge.roundsNeeded === String(rewardNextAfterTwo.minWins - 2) && terminal.terminalRewardNudge.targetWins === String(rewardNextAfterTwo.minWins) && terminal.terminalRewardNudge.copyMode === 'close' && terminal.terminalRewardNudge.preview === 'next', `${viewport.name}: terminal reward nudge milestone metadata wrong ${JSON.stringify({ rewardNextAfterTwo, terminalRewardNudge: terminal.terminalRewardNudge })}`);
      assert(terminal.terminalRewardNudge.dieRewardSkinned === true && terminal.terminalRewardNudge.dieName === rewardNextAfterTwo.name && terminal.terminalRewardNudge.dieEffect === rewardNextAfterTwo.effect, `${viewport.name}: terminal reward nudge should preview the next die skin ${JSON.stringify({ rewardNextAfterTwo, terminalRewardNudge: terminal.terminalRewardNudge })}`);
      assert(terminal.terminalRewardNudge.rect.height >= 68 && terminal.terminalRewardNudge.dieRect.width >= 52 && terminal.terminalRewardNudge.dieRect.height >= 52, `${viewport.name}: terminal reward nudge should read bigger than the old static dock ${JSON.stringify(terminal.terminalRewardNudge)}`);
      assert(terminal.terminalRewardNudge.animationName.includes('terminalRewardDockedAttract') && terminal.terminalRewardNudge.beforeAnimationName.includes('terminalRewardAttractSweep') && terminal.terminalRewardNudge.afterAnimationName.includes('terminalRewardAttractRim') && terminal.terminalRewardNudge.dieAnimationName.includes('terminalRewardDieFlash') && terminal.terminalRewardNudge.unlockAnimationName.includes('terminalRewardUnlockFlash'), `${viewport.name}: terminal reward nudge should carry attract-mode motion while the outcome panel stays calmer ${JSON.stringify(terminal.terminalRewardNudge)}`);
      if (viewport.mobile && viewport.width > 720) {
        assert(/padding-box/i.test(terminal.terminalRewardNudge.dieBackgroundClip || '') && /round/i.test(terminal.terminalRewardNudge.dieClipPath || terminal.terminalRewardNudge.dieWebkitClipPath || '') && terminal.terminalRewardNudge.dieOverflow === 'hidden' && terminal.terminalRewardNudge.dieWebkitMaskImage === 'none' && terminal.terminalRewardNudge.dieMaskImage === 'none', `${viewport.name}: iPad terminal reward nudge die should keep rounded clipped edges ${JSON.stringify(terminal.terminalRewardNudge)}`);
      }
      assert(terminal.terminalRewardNudge.abovePlayAgain === true && terminal.terminalRewardNudge.fitsViewport === true && terminal.terminalRewardNudge.layout === 'player-panel-dock' && terminal.terminalRewardNudge.overlapsPlayAgain === false && terminal.terminalRewardNudge.dockedToPlayerPanel === true, `${viewport.name}: terminal reward nudge should dock to the player pile panel without covering Keep Playing ${JSON.stringify(terminal.terminalRewardNudge)}`);
      if (viewport.mobile && viewport.width > 720) {
        assert(terminal.activeAnimationCount <= 12, `${viewport.name}: tablet win state has too many running animations ${JSON.stringify(terminal)}`);
      }
      await sleep(1700);
      const terminalLoop = await evalValue(page, `(() => ({
        stillComplete: !!(window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active),
        titleFanfare: document.getElementById('heroTitle').classList.contains('round-win-title-fanfare') || document.getElementById('heroTitle').classList.contains('round-win-title-sustain'),
        winnerPanel: document.getElementById('p1Inventory').closest('.player-panel').classList.contains('player-payout-fanfare'),
        winnerStatusLarge: document.getElementById('p1StatusBar').classList.contains('round-winner-praise'),
        winnerLabel: (document.getElementById('p1StatusText') || {}).textContent || '',
        trashedVisible: (() => {
          const stamp = document.getElementById('p2TrashedStamp');
          if (!stamp) return false;
          const r = stamp.getBoundingClientRect();
          const style = getComputedStyle(stamp);
          return style.visibility !== 'hidden' && parseFloat(style.opacity || '0') > 0.9 && r.width > 0 && r.height > 0;
        })(),
        rewardVisible: (() => {
          const shell = document.getElementById('rewardDieUnlock');
          return !!shell && !shell.hidden && shell.classList.contains('show');
        })(),
        celebratingDice: document.querySelectorAll('#p1Pile .bench-cheer-die').length,
        activeAnimationCount: document.getAnimations().filter(animation => animation.playState === 'running').length
      }))()`);
      assert(terminalLoop.stillComplete, `${viewport.name}: game over cleared before Play Again ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.titleFanfare === true, `${viewport.name}: title fanfare did not persist ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.winnerPanel === true, `${viewport.name}: lower winner panel fanfare should persist during sustained game-win loop ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.winnerStatusLarge === true, `${viewport.name}: large lower winner status should persist during game-win loop ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.winnerLabel === 'GAME WINNER!', `${viewport.name}: game winner label did not persist ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.trashedVisible === false, `${viewport.name}: TRASHED stamp should stay hidden through game-win loop ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.celebratingDice > 0, `${viewport.name}: dice celebration did not loop ${JSON.stringify(terminalLoop)}`);
      assert(terminalLoop.rewardVisible === false, `${viewport.name}: reward unlock should clear before sustained win loop ${JSON.stringify(terminalLoop)}`);
      if (viewport.mobile && viewport.width > 720) {
        assert(terminalLoop.activeAnimationCount <= 8, `${viewport.name}: tablet sustained win state has too many running animations ${JSON.stringify(terminalLoop)}`);
      }
      const utilityClick = await evalValue(page, `(() => {
        const mute = document.getElementById('audioMuteBtn');
        if (!mute) return { clicked: false, stillComplete: false };
        const wasPressed = mute.getAttribute('aria-pressed') === 'true';
        mute.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
        const stillAfterFirstClick = !!(window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active);
        if ((mute.getAttribute('aria-pressed') === 'true') !== wasPressed) {
          mute.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
        }
        return {
          clicked: true,
          stillComplete: stillAfterFirstClick && !!(window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active),
          restored: (mute.getAttribute('aria-pressed') === 'true') === wasPressed,
          events: window.TrashDiceAnalyticsDebug.log.map(item => item.eventName)
        };
      })()`);
      assert(utilityClick.clicked === true && utilityClick.stillComplete === true && utilityClick.restored === true, `${viewport.name}: utility control click should not restart game over ${JSON.stringify(utilityClick)}`);
      await evalValue(page, `document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, clientX: Math.round(window.innerWidth / 2), clientY: Math.round(window.innerHeight / 2) })); true`);
      await waitEval(page, `!window.TrashDiceQA.state().inlineGameOver && document.body.dataset.gameStarted === 'true'`, `${viewport.name} screen tap play again restart`);
      const screenRestartEvents = await evalValue(page, `window.TrashDiceAnalyticsDebug.log.map(item => ({ eventName: item.eventName, method: item.payload && item.payload.method }))`);
      assert(screenRestartEvents.some(item => item.eventName === 'td_play_again' && item.method === 'screen_tap'), `${viewport.name}: screen tap restart analytics missing ${JSON.stringify(screenRestartEvents)}`);
      assert(screenRestartEvents.some(item => item.eventName === 'td_game_start' && item.method === 'screen_tap'), `${viewport.name}: screen tap game start analytics missing ${JSON.stringify(screenRestartEvents)}`);
      const terminalCleared = await evalValue(page, `(() => ({
        titleFanfare: document.getElementById('heroTitle').classList.contains('round-win-title-fanfare') || document.getElementById('heroTitle').classList.contains('round-win-title-sustain'),
        winnerPanel: document.getElementById('p1Inventory').closest('.player-panel').classList.contains('player-payout-fanfare'),
        winnerPile: document.getElementById('p1Inventory').classList.contains('player-payout-fanfare'),
        winnerPraise: document.getElementById('p1StatusBar').classList.contains('payout-praise'),
        winnerStatusLarge: document.getElementById('p1StatusBar').classList.contains('round-winner-praise'),
        winnerCount: document.getElementById('p1Pool').classList.contains('payout-jackpot'),
        trashedVisible: (() => {
          const stamp = document.getElementById('p2TrashedStamp');
          if (!stamp) return false;
          const r = stamp.getBoundingClientRect();
          const style = getComputedStyle(stamp);
          return style.visibility !== 'hidden' && parseFloat(style.opacity || '0') > 0.01 && r.width > 0 && r.height > 0;
        })(),
        celebratingDice: document.querySelectorAll('.bench-cheer-die').length,
        terminalRewardNudgeHidden: (() => {
          const nudge = document.getElementById('terminalRewardNudge');
          return !!nudge && nudge.hidden;
        })()
      }))()`);
      assert(terminalCleared.titleFanfare === false, `${viewport.name}: title fanfare leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      assert(terminalCleared.winnerPanel === false, `${viewport.name}: winner panel fanfare leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      assert(terminalCleared.winnerPile === false, `${viewport.name}: winner dice pile fanfare leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      assert(terminalCleared.winnerPraise === false, `${viewport.name}: winner praise leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      assert(terminalCleared.winnerStatusLarge === false, `${viewport.name}: large winner status leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      assert(terminalCleared.winnerCount === false, `${viewport.name}: winner count fanfare leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      assert(terminalCleared.trashedVisible === false, `${viewport.name}: TRASHED stamp leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      assert(terminalCleared.celebratingDice === 0, `${viewport.name}: dice celebration leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      assert(terminalCleared.terminalRewardNudgeHidden === true, `${viewport.name}: terminal reward nudge leaked after Play Again ${JSON.stringify(terminalCleared)}`);
      ['td_session_start', 'td_game_start', 'td_first_roll', 'td_game_complete', 'td_game_win'].forEach(eventName => {
        assert(terminal.events.includes(eventName), `${viewport.name}: missing analytics event ${eventName}`);
      });

      await evalValue(page, `window.TrashDiceQA.setRewardWins(10); true`);
      const mathPlayerWin = await evalValue(page, `window.TrashDiceQA.mathematicalEndProof('p1', 16, 1, 0, 'p2')`);
      await waitEval(page, `window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active`, `${viewport.name} mathematical player win complete`);
      await waitEval(page, `window.TrashDiceQA.roundWinsWindupState().complete === true && window.TrashDiceQA.roundWinsWindupState().finalWins === 11`, `${viewport.name} mathematical player win round counter`, 5000);
      const mathPlayerWinUi = await evalValue(page, `(() => {
        const title = (document.getElementById('inlineResultTitle') || {}).textContent || '';
        const sub = (document.getElementById('inlineResultSub') || {}).textContent || '';
        const chip = document.getElementById('inlineResultChip');
        const chipText = document.getElementById('inlineResultChipText');
        const p1Status = document.getElementById('p1StatusBar');
        const p2Status = document.getElementById('p2StatusBar');
        const p1Rect = p1Status ? p1Status.getBoundingClientRect() : null;
        const p2Rect = p2Status ? p2Status.getBoundingClientRect() : null;
        const stamp = document.getElementById('p2TrashedStamp');
        const stampRect = stamp ? stamp.getBoundingClientRect() : null;
        const stampPanel = stamp ? stamp.closest('.player-panel') : null;
        const stampPanelRect = stampPanel ? stampPanel.getBoundingClientRect() : null;
        const stampStyle = stamp ? getComputedStyle(stamp) : null;
        const nudge = document.getElementById('terminalRewardNudge');
        const nudgeDie = document.getElementById('terminalRewardNudgeDie');
        const nudgeLine = document.getElementById('terminalRewardNudgeLine');
        const nudgeUnlock = document.getElementById('terminalRewardNudgeUnlock');
        const nudgeKicker = document.getElementById('terminalRewardNudgeKicker');
        const nudgeRect = nudge ? nudge.getBoundingClientRect() : null;
        const nudgeStyle = nudge ? getComputedStyle(nudge) : null;
        return {
          state: window.TrashDiceQA.state().inlineGameOver,
          rewardState: window.TrashDiceQA.rewardDieState(),
          roundWins: window.TrashDiceQA.state().roundWins,
          title,
          sub,
          chip: {
            visible: !!(chip && !chip.hidden && getComputedStyle(chip).display !== 'none'),
            text: chipText ? chipText.textContent || '' : ''
          },
          p1Text: (document.getElementById('p1StatusText') || {}).textContent || '',
          p2Text: (document.getElementById('p2StatusText') || {}).textContent || '',
          p1LoserReason: !!(p1Status && p1Status.classList.contains('loser-reason')),
          p2LoserReason: !!(p2Status && p2Status.classList.contains('loser-reason')),
          p1StatusFits: !!p1Rect && p1Rect.left >= -1 && p1Rect.right <= window.innerWidth + 1,
          p2StatusFits: !!p2Rect && p2Rect.left >= -1 && p2Rect.right <= window.innerWidth + 1,
          trashedStamp: {
            present: !!stamp,
            text: stamp ? stamp.textContent || '' : '',
            visible: !!stampRect && !!stampStyle && stampStyle.visibility !== 'hidden' && parseFloat(stampStyle.opacity || '0') > 0.9 && stampRect.width > 0 && stampRect.height > 0,
            fitsViewport: !!stampRect && stampRect.left >= -1 && stampRect.right <= window.innerWidth + 1 && stampRect.top >= -1 && stampRect.bottom <= window.innerHeight + 1,
            fitsPanel: !!stampRect && !!stampPanelRect && stampRect.left >= stampPanelRect.left - 1 && stampRect.right <= stampPanelRect.right + 1 && stampRect.top >= stampPanelRect.top - 1 && stampRect.bottom <= stampPanelRect.bottom + 1
          },
          terminalRewardNudge: {
            present: !!nudge,
            visible: !!nudge && !!nudgeStyle && !nudge.hidden && nudgeStyle.display !== 'none' && !!nudgeRect && nudgeRect.width >= 120 && nudgeRect.height >= 28,
            text: nudge ? nudge.textContent.replace(/\\s+/g, ' ').trim() : '',
            kicker: nudgeKicker ? nudgeKicker.textContent || '' : '',
            line: nudgeLine ? nudgeLine.textContent || '' : '',
            unlockLine: nudgeUnlock ? nudgeUnlock.textContent || '' : '',
            nextName: nudge ? nudge.dataset.nextName || '' : '',
            roundsNeeded: nudge ? nudge.dataset.roundsNeeded || '' : '',
            targetWins: nudge ? nudge.dataset.targetWins || '' : '',
            copyMode: nudge ? nudge.dataset.copyMode || '' : '',
            preview: nudge ? nudge.dataset.preview || '' : '',
            dieRewardSkinned: !!(nudgeDie && nudgeDie.classList.contains('reward-skinned')),
            dieName: nudgeDie ? nudgeDie.dataset.rewardName || '' : '',
            dieEffect: nudgeDie ? nudgeDie.dataset.rewardEffect || '' : ''
          },
          bodyFits: document.body.scrollWidth <= window.innerWidth + 1,
          scrollWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          offenders: Array.from(document.querySelectorAll('body *'))
            .map(el => {
              const r = el.getBoundingClientRect();
              return {
                tag: el.tagName,
                id: el.id || '',
                cls: typeof el.className === 'string' ? el.className : '',
                left: Math.round(r.left),
                right: Math.round(r.right),
                width: Math.round(r.width)
              };
            })
            .filter(item => item.right > window.innerWidth + 1 || item.left < -1)
            .slice(0, 8)
        };
      })()`);
      assert(mathPlayerWin.passed === true, `${viewport.name}: mathematical player win proof failed ${JSON.stringify(mathPlayerWin)}`);
      assert(mathPlayerWinUi.state.reason === 'mathematical_elimination', `${viewport.name}: mathematical player win reason missing ${JSON.stringify(mathPlayerWinUi)}`);
      assert(mathPlayerWin.inlineGameOver.finalRewardRoundCredited === true, `${viewport.name}: mathematical player win should mark the final reward round as credited ${JSON.stringify(mathPlayerWin.inlineGameOver)}`);
      assert(mathPlayerWin.inlineGameOver.rewardDie && mathPlayerWin.inlineGameOver.rewardDie.totalWins === 11 && mathPlayerWin.inlineGameOver.rewardDie.unlockedDie && mathPlayerWin.inlineGameOver.rewardDie.unlockedDie.name === rewardAtEleven.name, `${viewport.name}: mathematical player win should credit the final reward round at the LAVA threshold ${JSON.stringify({ rewardAtEleven, mathPlayerWin })}`);
      assert(mathPlayerWinUi.rewardState.totalWins === 11 && mathPlayerWinUi.rewardState.activeName === rewardAtEleven.name, `${viewport.name}: mathematical player win should advance reward state before terminal nudge ${JSON.stringify({ rewardAtEleven, rewardState: mathPlayerWinUi.rewardState })}`);
      assert(mathPlayerWinUi.roundWins && mathPlayerWinUi.roundWins.p1 >= 1, `${viewport.name}: mathematical player win should count as a player round win ${JSON.stringify(mathPlayerWinUi.roundWins)}`);
      assert(mathPlayerWinUi.terminalRewardNudge.present === true && mathPlayerWinUi.terminalRewardNudge.visible === true, `${viewport.name}: mathematical player win terminal reward nudge missing ${JSON.stringify(mathPlayerWinUi.terminalRewardNudge)}`);
      assert(mathPlayerWinUi.terminalRewardNudge.kicker === `CURRENT SKIN: ${rewardAtEleven.name}` && mathPlayerWinUi.terminalRewardNudge.line === `NEXT SKIN IN ${rewardNextAfterEleven.minWins - 11} ROUND WIN:` && mathPlayerWinUi.terminalRewardNudge.unlockLine === 'MYSTERY FINAL SKIN', `${viewport.name}: mathematical player win terminal nudge should tease the final mystery skin ${JSON.stringify({ rewardAtEleven, rewardNextAfterEleven, terminalRewardNudge: mathPlayerWinUi.terminalRewardNudge })}`);
      assert(mathPlayerWinUi.terminalRewardNudge.nextName === rewardNextAfterEleven.name && mathPlayerWinUi.terminalRewardNudge.roundsNeeded === String(rewardNextAfterEleven.minWins - 11) && mathPlayerWinUi.terminalRewardNudge.targetWins === String(rewardNextAfterEleven.minWins) && mathPlayerWinUi.terminalRewardNudge.copyMode === 'close' && mathPlayerWinUi.terminalRewardNudge.preview === 'current', `${viewport.name}: mathematical player win terminal nudge metadata wrong ${JSON.stringify({ rewardNextAfterEleven, terminalRewardNudge: mathPlayerWinUi.terminalRewardNudge })}`);
      assert(mathPlayerWinUi.terminalRewardNudge.dieRewardSkinned === true && mathPlayerWinUi.terminalRewardNudge.dieName === rewardAtEleven.name && mathPlayerWinUi.terminalRewardNudge.dieEffect === rewardAtEleven.effect, `${viewport.name}: mathematical player win should keep the current die visible while teasing the final mystery skin ${JSON.stringify({ rewardAtEleven, rewardNextAfterEleven, terminalRewardNudge: mathPlayerWinUi.terminalRewardNudge })}`);
      assert(mathPlayerWinUi.title === 'YOU TRASHED THE CPU!' && mathPlayerWinUi.sub === '' && mathPlayerWinUi.chip.visible === true && /ROUNDS WON:\s*x11/.test(mathPlayerWinUi.chip.text) && !mathPlayerWinUi.chip.text.includes('DICE SECURED'), `${viewport.name}: player-win banner should remove the subline and emphasize the round counter ${JSON.stringify(mathPlayerWinUi)}`);
      assert(!mathPlayerWinUi.sub.includes(MATHEMATICAL_ELIMINATION_STATUS), `${viewport.name}: mathematical reason should not appear under game winner ${JSON.stringify(mathPlayerWinUi)}`);
      assert(!mathPlayerWinUi.p1Text.includes(MATHEMATICAL_ELIMINATION_STATUS) && mathPlayerWinUi.p1LoserReason === false, `${viewport.name}: winning player should not carry mathematical loser copy ${JSON.stringify(mathPlayerWinUi)}`);
      assert(mathPlayerWinUi.p2Text === MATHEMATICAL_ELIMINATION_STATUS && mathPlayerWinUi.p2LoserReason === true, `${viewport.name}: green loser status should explain mathematical elimination ${JSON.stringify(mathPlayerWinUi)}`);
      assert(mathPlayerWinUi.p2StatusFits, `${viewport.name}: green loser status should fit in the viewport ${JSON.stringify(mathPlayerWinUi)}`);
      assert(mathPlayerWinUi.trashedStamp.present === true && mathPlayerWinUi.trashedStamp.text === 'TRASHED!' && mathPlayerWinUi.trashedStamp.visible === false, `${viewport.name}: mathematical player win should keep TRASHED hidden under the ordered terminal card ${JSON.stringify(mathPlayerWinUi)}`);

      await evalValue(page, `document.getElementById('rollBtn').click(); true`);
      await waitEval(page, `!window.TrashDiceQA.state().inlineGameOver && document.body.dataset.gameStarted === 'true'`, `${viewport.name} restart after mathematical player win`);

      await evalValue(page, `window.TrashDiceQA.setRewardWins(11); true`);
      const vipDiscoWin = await evalValue(page, `window.TrashDiceQA.mathematicalEndProof('p1', 16, 1, 0, 'p2')`);
      await waitEval(page, `window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active`, `${viewport.name} VIP DISCO player win complete`);
      await waitEval(page, `window.TrashDiceQA.roundWinsWindupState().complete === true && window.TrashDiceQA.roundWinsWindupState().finalWins === 12`, `${viewport.name} VIP DISCO round counter`, 5000);
      const vipDiscoUi = await evalValue(page, `(() => {
        const chip = document.getElementById('inlineResultChip');
        const chipText = document.getElementById('inlineResultChipText');
        const nudge = document.getElementById('terminalRewardNudge');
        const nudgeKicker = document.getElementById('terminalRewardNudgeKicker');
        const nudgeLine = document.getElementById('terminalRewardNudgeLine');
        const nudgeUnlock = document.getElementById('terminalRewardNudgeUnlock');
        const rewardShell = document.getElementById('rewardDieUnlock');
        const bodyAfter = getComputedStyle(document.body, '::after');
        return {
          state: window.TrashDiceQA.state().inlineGameOver,
          rewardState: window.TrashDiceQA.rewardDieState(),
          bodyVip: document.body.classList.contains('vip-disco-party'),
          bodyVipDataset: document.body.dataset.vipDiscoParty || '',
          discoOverlayAnimation: bodyAfter.animationName || '',
          discoOverlayOpacity: bodyAfter.opacity || '',
          discoOverlayPointerEvents: bodyAfter.pointerEvents || '',
          discoOverlayZIndex: bodyAfter.zIndex || '',
          chip: {
            visible: !!(chip && !chip.hidden && getComputedStyle(chip).display !== 'none'),
            text: chipText ? chipText.textContent.replace(/\\s+/g, ' ').trim() : '',
            vipClass: !!(chip && chip.classList.contains('is-vip')),
            winding: !!(chip && chip.classList.contains('is-winding')),
            roundWins: chip ? chip.dataset.roundWins || '' : ''
          },
          rewardUnlockVisible: !!(rewardShell && !rewardShell.hidden && rewardShell.classList.contains('show')),
          terminalRewardNudge: {
            present: !!nudge,
            visible: !!(nudge && !nudge.hidden && getComputedStyle(nudge).display !== 'none'),
            kicker: nudgeKicker ? nudgeKicker.textContent || '' : '',
            line: nudgeLine ? nudgeLine.textContent || '' : '',
            unlockLine: nudgeUnlock ? nudgeUnlock.textContent || '' : '',
            copyMode: nudge ? nudge.dataset.copyMode || '' : ''
          }
        };
      })()`);
      assert(vipDiscoWin.passed === true && vipDiscoWin.inlineGameOver.rewardDie && vipDiscoWin.inlineGameOver.rewardDie.totalWins === 12, `${viewport.name}: VIP DISCO win proof failed ${JSON.stringify(vipDiscoWin)}`);
      assert(vipDiscoWin.inlineGameOver.rewardDie.guidedCompletionPending === true && vipDiscoWin.inlineGameOver.rewardDie.guidedCompletionTriggered === false, `${viewport.name}: DISCO unlock should arm the beat-the-game event without firing it on the same result ${JSON.stringify(vipDiscoWin.inlineGameOver.rewardDie)}`);
      assert(vipDiscoUi.rewardState.totalWins === 12 && vipDiscoUi.rewardState.activeName === 'DISCO' && vipDiscoUi.rewardState.activeDie && vipDiscoUi.rewardState.activeDie.effect === 'discoBall' && vipDiscoUi.rewardState.capped === true && vipDiscoUi.rewardState.guidedCompletionPending === true && vipDiscoUi.rewardState.guidedGameCompleted !== true, `${viewport.name}: VIP DISCO reward state wrong ${JSON.stringify(vipDiscoUi.rewardState)}`);
      assert(vipDiscoUi.bodyVip === true && vipDiscoUi.bodyVipDataset === 'true' && vipDiscoUi.discoOverlayAnimation === 'none' && Number(vipDiscoUi.discoOverlayZIndex) <= 1 && Number(vipDiscoUi.discoOverlayOpacity) >= 0.25 && vipDiscoUi.discoOverlayPointerEvents === 'none', `${viewport.name}: VIP DISCO lighting should be visible, non-blocking, static under the moving cosmic sky, and behind the outcome/game UI ${JSON.stringify(vipDiscoUi)}`);
      assert(vipDiscoUi.chip.visible === true && vipDiscoUi.chip.vipClass === true && vipDiscoUi.chip.winding === false && vipDiscoUi.chip.roundWins === '12' && /ROUNDS WON:\s*x12/.test(vipDiscoUi.chip.text) && vipDiscoUi.chip.text.includes('COSMIC VIBES'), `${viewport.name}: VIP game-win chip should wind up to x12 and show the cosmic vibes badge ${JSON.stringify(vipDiscoUi.chip)}`);
      assert(vipDiscoUi.rewardUnlockVisible === false, `${viewport.name}: VIP game win should keep the payoff inside the terminal card instead of stacking an unlock card ${JSON.stringify(vipDiscoUi)}`);
      assert(vipDiscoUi.terminalRewardNudge.visible === true && vipDiscoUi.terminalRewardNudge.kicker === 'CURRENT SKIN: DISCO' && vipDiscoUi.terminalRewardNudge.unlockLine === 'DISCO DIE SKIN' && vipDiscoUi.terminalRewardNudge.copyMode === 'capped', `${viewport.name}: VIP game-win continuation nudge should show the capped DISCO skin while beat-the-game is pending ${JSON.stringify(vipDiscoUi.terminalRewardNudge)}`);
      await evalValue(page, `document.getElementById('rollBtn').click(); true`);
      await waitEval(page, `!window.TrashDiceQA.state().inlineGameOver && document.body.dataset.gameStarted === 'true'`, `${viewport.name} restart after VIP DISCO win`);

      const beatGameRoundWin = await evalValue(page, `window.TrashDiceDebug.roundWinEventProbe('p1')`);
      assert(beatGameRoundWin.rewardDieState.totalWins === 13 && beatGameRoundWin.rewardDieState.activeName === 'DISCO' && beatGameRoundWin.rewardDieState.guidedCompletionPending === false && beatGameRoundWin.rewardDieState.guidedGameCompleted === true, `${viewport.name}: beat-the-game round win should complete the guided path ${JSON.stringify(beatGameRoundWin.rewardDieState)}`);
      assert(beatGameRoundWin.roundWinBurstGuidedComplete === true && beatGameRoundWin.roundWinCapstoneLogoVisible === true && beatGameRoundWin.roundWinBurstText.includes('YOU BEAT THE GAME!') && beatGameRoundWin.roundWinBurstText.includes('You unlocked every die. How many more rounds can you win?'), `${viewport.name}: beat-the-game capstone round-win card missing headline, logo, or subcopy ${JSON.stringify(beatGameRoundWin)}`);
      assert(beatGameRoundWin.roundWinBurstRewardName === '' && beatGameRoundWin.roundWinBurstPreviewName === '' && beatGameRoundWin.roundWinBurstDieVisible === false && beatGameRoundWin.rewardDieVisible === false, `${viewport.name}: beat-the-game capstone should not show another unlock/chase die ${JSON.stringify(beatGameRoundWin)}`);

      const cpuEmptyPlaceWin = await evalValue(page, `window.TrashDiceQA.cpuEmptyRewardCreditProof('place', 0)`);
      assert(cpuEmptyPlaceWin.inlineGameOver && cpuEmptyPlaceWin.inlineGameOver.playerWon === true && cpuEmptyPlaceWin.inlineGameOver.sourceReason === 'place-empty', `${viewport.name}: CPU-empty place win should end as player win ${JSON.stringify(cpuEmptyPlaceWin)}`);
      assert(cpuEmptyPlaceWin.inlineGameOver.finalRewardRoundCredited === true && cpuEmptyPlaceWin.roundWins.p1 === 1 && cpuEmptyPlaceWin.after.totalWins === 1, `${viewport.name}: CPU-empty place win should count toward reward skins exactly once ${JSON.stringify(cpuEmptyPlaceWin)}`);
      await evalValue(page, `document.getElementById('rollBtn').click(); true`);
      await waitEval(page, `!window.TrashDiceQA.state().inlineGameOver && document.body.dataset.gameStarted === 'true'`, `${viewport.name} restart after CPU-empty place win`);

      const cpuEmptyTrashWin = await evalValue(page, `window.TrashDiceQA.cpuEmptyRewardCreditProof('trash', 10)`);
      assert(cpuEmptyTrashWin.inlineGameOver && cpuEmptyTrashWin.inlineGameOver.playerWon === true && cpuEmptyTrashWin.inlineGameOver.sourceReason === 'trash-empty', `${viewport.name}: CPU-empty trash win should end as player win ${JSON.stringify(cpuEmptyTrashWin)}`);
      assert(cpuEmptyTrashWin.inlineGameOver.finalRewardRoundCredited === true && cpuEmptyTrashWin.roundWins.p1 === 1 && cpuEmptyTrashWin.after.totalWins === 11 && cpuEmptyTrashWin.after.activeName === rewardAtEleven.name, `${viewport.name}: CPU-empty trash win should unlock/count reward tier at threshold ${JSON.stringify({ rewardAtEleven, cpuEmptyTrashWin })}`);
      await evalValue(page, `document.getElementById('rollBtn').click(); true`);
      await waitEval(page, `!window.TrashDiceQA.state().inlineGameOver && document.body.dataset.gameStarted === 'true'`, `${viewport.name} restart after CPU-empty trash win`);

      const mathPlayerLoss = await evalValue(page, `window.TrashDiceQA.mathematicalEndProof('p2', 16, 1, 0, 'p1')`);
      await waitEval(page, `window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.active`, `${viewport.name} mathematical player loss complete`);
      await sleep(760);
      const mathPlayerLossUi = await evalValue(page, `(() => {
        const title = (document.getElementById('inlineResultTitle') || {}).textContent || '';
        const sub = (document.getElementById('inlineResultSub') || {}).textContent || '';
        const p1Status = document.getElementById('p1StatusBar');
        const p2Status = document.getElementById('p2StatusBar');
        const p1Rect = p1Status ? p1Status.getBoundingClientRect() : null;
        const p2Rect = p2Status ? p2Status.getBoundingClientRect() : null;
        const stamp = document.getElementById('p2TrashedStamp');
        const stampRect = stamp ? stamp.getBoundingClientRect() : null;
        const stampStyle = stamp ? getComputedStyle(stamp) : null;
        return {
          state: window.TrashDiceQA.state().inlineGameOver,
          postLossComeback: window.TrashDiceQA.state().postLossComebackRound,
          title,
          sub,
          p1Text: (document.getElementById('p1StatusText') || {}).textContent || '',
          p2Text: (document.getElementById('p2StatusText') || {}).textContent || '',
          p1LoserReason: !!(p1Status && p1Status.classList.contains('loser-reason')),
          p2LoserReason: !!(p2Status && p2Status.classList.contains('loser-reason')),
          p1StatusFits: !!p1Rect && p1Rect.left >= -1 && p1Rect.right <= window.innerWidth + 1,
          p2StatusFits: !!p2Rect && p2Rect.left >= -1 && p2Rect.right <= window.innerWidth + 1,
          trashedVisible: !!stampRect && !!stampStyle && stampStyle.visibility !== 'hidden' && parseFloat(stampStyle.opacity || '0') > 0.01 && stampRect.width > 0 && stampRect.height > 0,
          bodyFits: document.body.scrollWidth <= window.innerWidth + 1,
          scrollWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          offenders: Array.from(document.querySelectorAll('body *'))
            .map(el => {
              const r = el.getBoundingClientRect();
              return {
                tag: el.tagName,
                id: el.id || '',
                cls: typeof el.className === 'string' ? el.className : '',
                left: Math.round(r.left),
                right: Math.round(r.right),
                width: Math.round(r.width)
              };
            })
            .filter(item => item.right > window.innerWidth + 1 || item.left < -1)
            .slice(0, 8)
        };
      })()`);
      assert(mathPlayerLoss.passed === true, `${viewport.name}: mathematical player loss proof failed ${JSON.stringify(mathPlayerLoss)}`);
      assert(mathPlayerLossUi.state.reason === 'mathematical_elimination', `${viewport.name}: mathematical player loss reason missing ${JSON.stringify(mathPlayerLossUi)}`);
      assert(mathPlayerLossUi.postLossComeback.pending === true && mathPlayerLossUi.postLossComeback.active === false, `${viewport.name}: player game loss should arm next-game comeback without activating on game-over screen ${JSON.stringify(mathPlayerLossUi.postLossComeback)}`);
      assert(mathPlayerLossUi.title === 'KEEP TRYING!' && mathPlayerLossUi.sub === 'CPU WINS', `${viewport.name}: player-loss banner should invite a retry ${JSON.stringify(mathPlayerLossUi)}`);
      assert(mathPlayerLossUi.p1Text === MATHEMATICAL_ELIMINATION_STATUS && mathPlayerLossUi.p1LoserReason === true, `${viewport.name}: yellow loser status should explain mathematical elimination ${JSON.stringify(mathPlayerLossUi)}`);
      assert(!mathPlayerLossUi.p2Text.includes(MATHEMATICAL_ELIMINATION_STATUS) && mathPlayerLossUi.p2LoserReason === false, `${viewport.name}: winning green panel should not carry mathematical loser copy ${JSON.stringify(mathPlayerLossUi)}`);
      assert(mathPlayerLossUi.p1StatusFits, `${viewport.name}: yellow loser status should fit in the viewport ${JSON.stringify(mathPlayerLossUi)}`);
      assert(mathPlayerLossUi.trashedVisible === false, `${viewport.name}: TRASHED stamp should not appear when CPU wins ${JSON.stringify(mathPlayerLossUi)}`);

      await evalValue(page, `document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, clientX: Math.round(window.innerWidth / 2), clientY: Math.round(window.innerHeight / 2) })); true`);
      await waitEval(page, `!window.TrashDiceQA.state().inlineGameOver && document.body.dataset.gameStarted === 'true'`, `${viewport.name} screen tap restart after mathematical player loss`);
      const postLossRestart = await evalValue(page, `window.TrashDiceQA.state().postLossComebackRound`);
      assert(postLossRestart.pending === true && postLossRestart.active === true && postLossRestart.consumed === false, `${viewport.name}: post-loss comeback should activate on the next game's first round ${JSON.stringify(postLossRestart)}`);
      const lossScreenRestartCount = await evalValue(page, `window.TrashDiceAnalyticsDebug.log.filter(item => item.eventName === 'td_play_again' && item.payload && item.payload.method === 'screen_tap').length`);
      assert(lossScreenRestartCount >= 2, `${viewport.name}: loss screen tap restart analytics missing`);

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

      reports.push({ viewport: viewport.name, status: 'ok', events: quitDismissed, preShipPerf: preShipPerf.summary });
    }

    const productionIpadViewport = viewports.find(viewport => viewport.name === 'ipad-portrait');
    const productionIpad = await openPage(`${productionLikeBaseUrl}?source=qa&qa-hooks=1`, productionIpadViewport);
    await waitEval(productionIpad, `!!window.TrashDiceQA && window.TrashDiceQA.state().qaHooks === true`, 'production-like iPad QA hooks');
    const productionIpadInitialStart = await evalValue(productionIpad, `(() => {
      const can = document.querySelector('.start-lurker-can');
      const rect = can ? can.getBoundingClientRect() : null;
      const canStyle = can ? getComputedStyle(can) : null;
      return {
        state: window.TrashDiceQA.state(),
        bodyClasses: document.body.className,
        canDisplay: canStyle ? canStyle.display : '',
        canAnimationName: canStyle ? canStyle.animationName : '',
        canTransform: canStyle ? canStyle.transform : '',
        canVisible: !!(can && canStyle.display !== 'none' && canStyle.visibility !== 'hidden' && Number(canStyle.opacity || 1) > 0.01 && rect.width > 0 && rect.height > 0),
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
      const canStyle = can ? getComputedStyle(can) : null;
      return {
        canDisplay: canStyle ? canStyle.display : '',
        canTransform: canStyle ? canStyle.transform : '',
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
    const productionIpadTitleCanTravel = Math.abs(productionIpadInitial.canSecondLeft - productionIpadInitial.canFirstLeft);
    assert(productionIpadInitial.bodyClasses.includes('ipad-title-can-hidden') && productionIpadInitial.canDisplay === 'none' && productionIpadInitial.canAnimationName === 'none' && productionIpadInitial.canVisible === false && productionIpadTitleCanTravel === 0, `production-like iPad title can should be removed from the title screen ${JSON.stringify({ productionIpadInitial, productionIpadInitialEnd, productionIpadTitleCanTravel })}`);

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

    const productionIpadRollVisual = await evalValue(productionIpad, ipadRollVisualProbeScript(3, 760, 32));
    const productionIpadRollStarted = productionIpadRollVisual.firstActive || productionIpadRollVisual;
    assert((productionIpadRollVisual.visible === true && productionIpadRollVisual.stageClass.includes('active')) || productionIpadRollStarted.active === true, `production-like iPad hero die is not visibly rolling ${JSON.stringify(productionIpadRollVisual)}`);
    assert((productionIpadRollVisual.className.includes('ipad-rolling') || productionIpadRollStarted.className.includes('ipad-rolling')) && (productionIpadRollVisual.stageClass.includes('active') || productionIpadRollStarted.stageClass.includes('active')), `production-like iPad hero die roll class is missing ${JSON.stringify(productionIpadRollVisual)}`);
    assert((productionIpadRollVisual.rect.width >= 380 && productionIpadRollVisual.rect.width <= 460 && productionIpadRollVisual.dotRect && productionIpadRollVisual.dotRect.width >= 58) || (productionIpadRollStarted.stageCssWidth >= 300 && productionIpadRollStarted.dotCssMaxWidth >= 58), `production-like iPad hero roll die should be about 3x larger with scaled pips ${JSON.stringify(productionIpadRollVisual)}`);
    const productionIpadPrismSpin = await evalValue(productionIpad, rewardHeroBodySpinProbeScript(rewardPrism.minWins, 4, 760, 24));
    assert(productionIpadPrismSpin.firstActive && productionIpadPrismSpin.firstActive.rewardSkinned === true && productionIpadPrismSpin.firstActive.effect === rewardPrism.effect, `production-like iPad PRISM hero roll probe did not activate the PRISM reward die ${JSON.stringify({ rewardPrism, productionIpadPrismSpin })}`);
    assert(productionIpadPrismSpin.animationNames.includes('rewardDieRollMobile') && productionIpadPrismSpin.activeSamples >= 2 && productionIpadPrismSpin.rollKeyframeTransformCount >= 2 && (productionIpadPrismSpin.uniqueTransformCount >= 2 || productionIpadPrismSpin.rollAnimationCurrentTimeDelta >= 40), `production-like iPad PRISM reward hero die body should visibly spin during roll ${JSON.stringify(productionIpadPrismSpin)}`);
    const productionIpadPrismTravelMotion = await evalValue(productionIpad, `window.TrashDiceQA.rewardTravelCloneProbe(${JSON.stringify(rewardPrism.minWins)})`);
    assert(productionIpadPrismTravelMotion.toSlot.rewardSkinned === true && productionIpadPrismTravelMotion.toSlot.effect === rewardPrism.effect && (productionIpadPrismTravelMotion.toSlot.animationName || '').includes('dieArcToLidIpadLite') && !(productionIpadPrismTravelMotion.toSlot.animationName || '').includes('rewardPrismCycle'), `production-like iPad PRISM travel clone should keep the iPad lid arc instead of the idle prism cycle ${JSON.stringify(productionIpadPrismTravelMotion)}`);
    assert(productionIpadPrismTravelMotion.toTrash.rewardSkinned === true && productionIpadPrismTravelMotion.toTrash.effect === rewardPrism.effect && (productionIpadPrismTravelMotion.toTrash.animationName || '').includes('dieArcToCanIpadLite') && !(productionIpadPrismTravelMotion.toTrash.animationName || '').includes('rewardPrismCycle'), `production-like iPad PRISM travel clone should keep the iPad trash arc instead of the idle prism cycle ${JSON.stringify(productionIpadPrismTravelMotion)}`);

    const productionIpadHandoff = await evalValue(productionIpad, `window.TrashDiceQA.cpuHandoffProbe(2, 'place')`);
    assert(productionIpadHandoff.expectedHandoffMs <= 180, `production-like iPad CPU handoff constant is too slow ${JSON.stringify(productionIpadHandoff)}`);
    assert(productionIpadHandoff.totalMs <= 1300, `production-like iPad roll-to-ready path is too slow ${JSON.stringify(productionIpadHandoff)}`);
    const fullBoardDoRollGuard = await evalValue(productionIpad, `window.TrashDiceQA.fullBoardGuardProbe('doRoll', 'p2')`);
    assert(fullBoardDoRollGuard.after.current === 'p2', `full-board doRoll guard should not flip current ${JSON.stringify(fullBoardDoRollGuard)}`);
    assert(fullBoardDoRollGuard.after.p2Dice === fullBoardDoRollGuard.before.p2Dice && fullBoardDoRollGuard.after.totalRolls === fullBoardDoRollGuard.before.totalRolls, `full-board doRoll guard should not spend CPU dice or count a roll ${JSON.stringify(fullBoardDoRollGuard)}`);
    assert(fullBoardDoRollGuard.after.roundResolution && fullBoardDoRollGuard.after.roundResolution.winner === 'p2' && fullBoardDoRollGuard.after.roundResolution.payoutStarted === true, `full-board doRoll guard should resolve for the current winner ${JSON.stringify(fullBoardDoRollGuard)}`);
    const fullBoardNextTurnGuard = await evalValue(productionIpad, `window.TrashDiceQA.fullBoardGuardProbe('nextTurn', 'p1')`);
    assert(fullBoardNextTurnGuard.after.current === 'p1', `full-board nextTurn guard should not flip current before resolution ${JSON.stringify(fullBoardNextTurnGuard)}`);
    assert(fullBoardNextTurnGuard.after.p1Dice === fullBoardNextTurnGuard.before.p1Dice && fullBoardNextTurnGuard.after.totalRolls === fullBoardNextTurnGuard.before.totalRolls, `full-board nextTurn guard should not spend dice or count a roll ${JSON.stringify(fullBoardNextTurnGuard)}`);
    assert(fullBoardNextTurnGuard.after.roundResolution && fullBoardNextTurnGuard.after.roundResolution.winner === 'p1' && fullBoardNextTurnGuard.after.roundResolution.payoutStarted === true, `full-board nextTurn guard should resolve for the pre-toggle winner ${JSON.stringify(fullBoardNextTurnGuard)}`);
    const productionIpadPreShipPerf = await evalValue(productionIpad, preShipPerfLeakProbeScript({
      cycles: 2,
      sampleMs: 320,
      capWins: rewardCapDie.minWins,
      prismWins: rewardPrism.minWins
    }));
    assertPreShipPerfLeakProbe('ipad-portrait-production-like', productionIpadPreShipPerf);
    reports.push({
      viewport: 'ipad-portrait-production-like',
      status: 'ok',
      timings: productionIpadActive.state.timings,
      rollVisual: productionIpadRollVisual,
      preShipPerf: productionIpadPreShipPerf.summary,
      cpuHandoff: {
        totalMs: productionIpadHandoff.totalMs,
        handoffMs: productionIpadHandoff.handoffMs,
        expectedHandoffMs: productionIpadHandoff.expectedHandoffMs,
        fullBoardDoRollGuard,
        fullBoardNextTurnGuard
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
      const can = document.querySelector('.start-lurker-can');
      const rect = note ? note.getBoundingClientRect() : null;
      const canRect = can ? can.getBoundingClientRect() : null;
      const canStyle = can ? getComputedStyle(can) : null;
      return {
        state: window.TrashDiceQA.state(),
        bodyClasses: document.body.className,
        deviceProfile: document.body.dataset.deviceProfile || '',
        titleCan: can ? {
          display: canStyle.display,
          animationName: canStyle.animationName,
          visible: canStyle.display !== 'none' && canStyle.visibility !== 'hidden' && Number(canStyle.opacity || 1) > 0.01 && canRect.width > 0 && canRect.height > 0,
          rect: { top: canRect.top, right: canRect.right, bottom: canRect.bottom, left: canRect.left, width: canRect.width, height: canRect.height }
        } : null,
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
    assert(modernIpadInitial.bodyClasses.includes('ipad-title-can-hidden') && modernIpadInitial.titleCan && modernIpadInitial.titleCan.visible === false && modernIpadInitial.titleCan.display === 'none', `modern iPad title can should be hidden, not parked next to the start card ${JSON.stringify(modernIpadInitial)}`);
    assert(modernIpadInitial.guidance && modernIpadInitial.guidance.visible === false, `modern iPad should not show legacy guidance ${JSON.stringify(modernIpadInitial)}`);

    const tallIpadTitleViewport = {
      ...productionIpadViewport,
      name: 'ipad-title-tall-safari',
      width: 1024,
      height: 1260,
      screenWidth: 1024,
      screenHeight: 1366,
      userAgent: IPAD_OS18_USER_AGENT,
      platform: 'iPad'
    };
    const tallIpadTitle = await openPage(`${productionLikeBaseUrl}?source=qa&qa-hooks=1&tall-ipad-title=1`, tallIpadTitleViewport);
    await waitEval(tallIpadTitle, `!!window.TrashDiceQA && window.TrashDiceQA.state().qaHooks === true`, 'tall iPad title QA hooks');
    const tallIpadTitleInitial = await evalValue(tallIpadTitle, `(() => {
      const can = document.querySelector('.start-lurker-can');
      const card = document.querySelector('.start-blob-wrap');
      const canRect = can ? can.getBoundingClientRect() : null;
      const cardRect = card ? card.getBoundingClientRect() : null;
      const canStyle = can ? getComputedStyle(can) : null;
      return {
        state: window.TrashDiceQA.state(),
        bodyClasses: document.body.className,
        canDisplay: canStyle ? canStyle.display : '',
        canAnimationName: canStyle ? canStyle.animationName : '',
        canVisible: !!(can && canStyle.display !== 'none' && canStyle.visibility !== 'hidden' && Number(canStyle.opacity || 1) > 0.01 && canRect.width > 0 && canRect.height > 0),
        canRect: canRect ? { top: canRect.top, right: canRect.right, bottom: canRect.bottom, left: canRect.left, width: canRect.width, height: canRect.height } : null,
        cardRect: cardRect ? { top: cardRect.top, right: cardRect.right, bottom: cardRect.bottom, left: cardRect.left, width: cardRect.width, height: cardRect.height } : null
      };
    })()`);
    assert(tallIpadTitleInitial.state.deviceProfile.isIpad === true && tallIpadTitleInitial.state.tabletEffectsLite === false, `tall iPad probe should reproduce the non-tablet-effects title path ${JSON.stringify(tallIpadTitleInitial)}`);
    assert(tallIpadTitleInitial.bodyClasses.includes('ipad-title-can-hidden') && tallIpadTitleInitial.canDisplay === 'none' && tallIpadTitleInitial.canVisible === false, `tall iPad title can should not appear beside the start card ${JSON.stringify(tallIpadTitleInitial)}`);
    await evalValue(tallIpadTitle, `document.getElementById('startBtn').click(); true`);
    await waitEval(tallIpadTitle, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, 'tall iPad game start');
    const tallIpadRollVisual = await evalValue(tallIpadTitle, rollHeroTravelVisualProbeScript(5, 1800, 32));
    const tallIpadRollStarted = tallIpadRollVisual.firstActive || tallIpadRollVisual.bestRoll;
    const tallIpadBestRoll = tallIpadRollVisual.bestRoll || tallIpadRollStarted;
    const tallIpadTravel = tallIpadRollVisual.bestTravel || tallIpadRollVisual.firstTravel;
    const tallIpadRollHasHeroRect = !!(tallIpadBestRoll && tallIpadBestRoll.rect.width >= 380 && tallIpadBestRoll.rect.width <= 520 && tallIpadBestRoll.dotRect && tallIpadBestRoll.dotRect.width >= 58);
    const tallIpadRollHasHeroCss = !!(tallIpadBestRoll && tallIpadBestRoll.stageCssWidth >= 300 && tallIpadBestRoll.dotCssMaxWidth >= 58);
    const tallIpadTravelHasHeroPips = !!(tallIpadTravel && tallIpadTravel.dotRect && tallIpadTravel.rect && tallIpadTravel.rect.width >= 280 && tallIpadTravel.dotRect.width >= 54 && tallIpadTravel.dotCssMaxWidth >= 58);
    assert(tallIpadRollStarted && tallIpadRollStarted.active === true && tallIpadRollVisual.state.deviceProfile.isIpad === true && tallIpadRollVisual.state.iPadGameplayPerformanceMode === false, `tall iPad hero die should roll on the non-performance iPad path ${JSON.stringify(tallIpadRollVisual)}`);
    assert(tallIpadRollHasHeroRect || tallIpadRollHasHeroCss, `tall iPad hero roll die should use the enlarged iPad sizing ${JSON.stringify(tallIpadRollVisual)}`);
    assert(tallIpadBestRoll.rect.left >= -20 && tallIpadBestRoll.rect.right <= tallIpadTitleViewport.width + 20 && tallIpadBestRoll.rect.top >= -20 && tallIpadBestRoll.rect.bottom <= tallIpadTitleViewport.height + 20, `tall iPad enlarged hero die should stay framed ${JSON.stringify(tallIpadRollVisual)}`);
    assert(tallIpadTravel && tallIpadTravel.className.includes('hero-travel-scale') && tallIpadTravel.motionClass === 'to-slot-physical' && tallIpadTravelHasHeroPips, `tall iPad travel die should keep enlarged pips while moving to the lid ${JSON.stringify(tallIpadRollVisual)}`);
    const tallIpadPrismTravelPage = await openPage(`${productionLikeBaseUrl}?source=qa&qa-hooks=1&tall-ipad-prism-travel=1`, tallIpadTitleViewport);
    await waitEval(tallIpadPrismTravelPage, `!!window.TrashDiceQA && window.TrashDiceQA.state().qaHooks === true`, 'tall iPad PRISM travel QA hooks');
    await evalValue(tallIpadPrismTravelPage, `document.getElementById('startBtn').click(); true`);
    await waitEval(tallIpadPrismTravelPage, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, 'tall iPad PRISM travel game start');
    const tallIpadPrismTravelVisual = await evalValue(tallIpadPrismTravelPage, rollHeroTravelVisualProbeScript(4, 1800, 32, rewardPrism.minWins));
    const tallIpadPrismTravel = tallIpadPrismTravelVisual.bestTravel || tallIpadPrismTravelVisual.firstTravel;
    assert(tallIpadPrismTravel && tallIpadPrismTravel.rewardSkinned === true && tallIpadPrismTravel.effect === rewardPrism.effect, `tall iPad PRISM travel probe did not activate the PRISM reward die ${JSON.stringify({ rewardPrism, tallIpadPrismTravelVisual })}`);
    assert(tallIpadPrismTravel.motionClass === 'to-slot-physical' && (tallIpadPrismTravel.animationName || '').includes('dieArcToLidMobile') && !(tallIpadPrismTravel.animationName || '').includes('rewardPrismCycle'), `tall iPad PRISM travel should fly to the lid instead of running the idle prism cycle ${JSON.stringify(tallIpadPrismTravelVisual)}`);

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
        canDisplay: can ? getComputedStyle(can).display : '',
        canAnimationName: can ? getComputedStyle(can).animationName : '',
        canAnimationDuration: can ? getComputedStyle(can).animationDuration : '',
        canVisible: !!(can && getComputedStyle(can).display !== 'none' && getComputedStyle(can).visibility !== 'hidden' && Number(getComputedStyle(can).opacity || 1) > 0.01 && rect.width > 0 && rect.height > 0),
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
    assert(legacyIpadInitialStart.deviceProfile === 'legacy-ipad' && legacyIpadInitialStart.bodyClasses.includes('legacy-ipad-performance') && legacyIpadInitialStart.bodyClasses.includes('ipad-title-can-hidden'), `legacy iPad body profile missing ${JSON.stringify(legacyIpadInitialStart)}`);
    assert(legacyIpadInitialStart.guidance && legacyIpadInitialStart.guidance.visible === true, `legacy iPad guidance should be visible ${JSON.stringify(legacyIpadInitialStart)}`);
    assert(legacyIpadInitialStart.guidance.text === 'For the smoothest experience, play on iPhone, desktop, or a newer iPad.', `legacy iPad guidance copy changed ${JSON.stringify(legacyIpadInitialStart.guidance)}`);
    assert(legacyIpadInitialStart.canDisplay === 'none' && legacyIpadInitialStart.canVisible === false && legacyIpadTitleCanTravel === 0, `legacy iPad title can should be hidden instead of parked beside the start card ${JSON.stringify({ legacyIpadInitialStart, legacyIpadInitialEnd, legacyIpadTitleCanTravel })}`);

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

    const legacyIpadRollVisual = await evalValue(legacyIpad, ipadRollVisualProbeScript(4, 420, 24));
    const legacyIpadRollStarted = legacyIpadRollVisual.firstActive || legacyIpadRollVisual;
    assert((legacyIpadRollVisual.visible === true && legacyIpadRollVisual.stageClass.includes('active')) || legacyIpadRollStarted.active === true, `legacy iPad hero die should remain visible during snap-roll ${JSON.stringify(legacyIpadRollVisual)}`);
    assert((legacyIpadRollVisual.className.includes('ipad-rolling') || legacyIpadRollStarted.className.includes('ipad-rolling')) && (legacyIpadRollVisual.animations.some(animation => animation.name === 'dieRollLegacyIpad') || legacyIpadRollStarted.animations.some(animation => animation.name === 'dieRollLegacyIpad')), `legacy iPad roll animation should use snap-roll profile ${JSON.stringify(legacyIpadRollVisual)}`);
    assert((legacyIpadRollVisual.rect.width >= 380 && legacyIpadRollVisual.rect.width <= 460 && legacyIpadRollVisual.dotRect && legacyIpadRollVisual.dotRect.width >= 58) || (legacyIpadRollStarted.stageCssWidth >= 300 && legacyIpadRollStarted.dotCssMaxWidth >= 58), `legacy iPad hero roll die should be about 3x larger with scaled pips ${JSON.stringify(legacyIpadRollVisual)}`);

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

    const desktopRollStartViewport = viewports.find(viewport => viewport.name === 'desktop');
    const desktopRollStart = await openPage(`${baseUrl}?source=qa&qa=1&desktop-roll-start-stability=1`, desktopRollStartViewport);
    await waitEval(desktopRollStart, `!!window.TrashDiceQA && window.TrashDiceQA.state().qaHooks === true`, 'desktop roll-start stability QA hooks');
    await evalValue(desktopRollStart, `document.getElementById('startBtn').click(); true`);
    await waitEval(desktopRollStart, `document.body.dataset.gameStarted === 'true' && document.body.classList.contains('player-roll-ready') && !document.getElementById('rollBtn').disabled`, 'desktop roll-start ready state');
    const desktopRollStartStability = await evalValue(desktopRollStart, desktopRollStartStabilityProbeScript(360, 24));
    assert(desktopRollStartStability.before.bodyReady === true && desktopRollStartStability.before.boardAnimationName === 'lidIdleReadyStable', `desktop roll-start probe should begin from transform-stable ready-state lid idle ${JSON.stringify(desktopRollStartStability)}`);
    assert(desktopRollStartStability.maxBoardShiftPx <= 0.75, `desktop roll start should not snap or shutter the lid board ${JSON.stringify(desktopRollStartStability)}`);
    assert(desktopRollStartStability.stageFilters.every(filter => filter === 'none'), `desktop enlarged hero roll stage should avoid filter flashes during roll start ${JSON.stringify(desktopRollStartStability)}`);
    reports.push({
      viewport: 'desktop-roll-start-stability',
      status: 'ok',
      maxBoardShiftPx: desktopRollStartStability.maxBoardShiftPx,
      stageFilters: desktopRollStartStability.stageFilters
    });

    const travelCheckViewports = [
      viewports.find(viewport => viewport.name === 'desktop'),
      viewports.find(viewport => viewport.name === 'iphone-se-visible'),
      viewports.find(viewport => viewport.name === 'iphone-13-safari')
    ].filter(Boolean);
    for (const travelViewport of travelCheckViewports) {
      const heroRollExpected = HERO_ROLL_VISUAL_EXPECTATIONS[travelViewport.name];
      const travelProbe = await openPage(`${baseUrl}?source=qa&qa=1&travel-visual=${encodeURIComponent(travelViewport.name)}`, travelViewport);
      await waitEval(travelProbe, `!!window.TrashDiceQA && window.TrashDiceQA.state().qaHooks === true`, `${travelViewport.name} travel visual QA hooks`);
      await evalValue(travelProbe, `document.getElementById('startBtn').click(); true`);
      await waitEval(travelProbe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, `${travelViewport.name} travel visual game start`);
      const travelVisual = await evalValue(travelProbe, rollHeroTravelVisualProbeScript(4, travelViewport.mobile ? 1650 : 1750, 32));
      const activeRoll = travelVisual.firstActive;
      const rollStarted = travelVisual.bestRoll || activeRoll;
      const travelDie = travelVisual.bestTravel || travelVisual.firstTravel;
      const expectedTravelAnimation = travelViewport.mobile ? 'dieArcToLidMobile' : 'dieArcToLid';
      assert(activeRoll && activeRoll.active === true && rollStarted && heroRollExpected && rollStarted.stageCssWidth >= heroRollExpected.stageMin && rollStarted.stageCssWidth <= heroRollExpected.stageMax && rollStarted.dotCssMaxWidth >= heroRollExpected.dotCssMin, `${travelViewport.name}: hero die should visibly roll at the tuned hero size before travel ${JSON.stringify(travelVisual)}`);
      assert(travelDie && travelDie.className.includes('hero-travel-scale') && travelDie.motionClass === 'to-slot-physical', `${travelViewport.name}: travelling die should carry hero scale class while moving to the lid ${JSON.stringify(travelVisual)}`);
      assert(Math.abs((travelDie.dotCssMaxWidth || 0) - (rollStarted.dotCssMaxWidth || 0)) <= 1 && travelDie.dotCssMaxWidth >= heroRollExpected.dotCssMin && travelDie.dotRect && travelDie.dotRect.width >= 17, `${travelViewport.name}: travelling die pips should keep the hero roll CSS sizing during travel ${JSON.stringify(travelVisual)}`);
      const prismTravelProbe = await openPage(`${baseUrl}?source=qa&qa=1&prism-travel-visual=${encodeURIComponent(travelViewport.name)}`, travelViewport);
      await waitEval(prismTravelProbe, `!!window.TrashDiceQA && window.TrashDiceQA.state().qaHooks === true`, `${travelViewport.name} PRISM travel visual QA hooks`);
      await evalValue(prismTravelProbe, `document.getElementById('startBtn').click(); true`);
      await waitEval(prismTravelProbe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, `${travelViewport.name} PRISM travel visual game start`);
      const prismTravelVisual = await evalValue(prismTravelProbe, rollHeroTravelVisualProbeScript(4, travelViewport.mobile ? 1650 : 1750, 32, rewardPrism.minWins));
      const prismTravelDie = prismTravelVisual.bestTravel || prismTravelVisual.firstTravel;
      assert(prismTravelDie && prismTravelDie.rewardSkinned === true && prismTravelDie.effect === rewardPrism.effect, `${travelViewport.name}: PRISM travel visual probe did not activate the PRISM reward die ${JSON.stringify({ rewardPrism, prismTravelVisual })}`);
      assert(prismTravelDie.motionClass === 'to-slot-physical' && (prismTravelDie.animationName || '').includes(expectedTravelAnimation) && !(prismTravelDie.animationName || '').includes('rewardPrismCycle'), `${travelViewport.name}: PRISM travelling die should fly to the lid instead of replaying the idle prism reveal cycle ${JSON.stringify({ expectedTravelAnimation, prismTravelVisual })}`);
      reports.push({
        viewport: `${travelViewport.name}-travel-visual`,
        status: 'ok',
        rollStageCssWidth: rollStarted.stageCssWidth,
        rollDotCssMaxWidth: rollStarted.dotCssMaxWidth,
        travelDotCssMaxWidth: travelDie.dotCssMaxWidth,
        travelDotRect: travelDie.dotRect,
        prismTravelAnimationName: prismTravelDie.animationName
      });
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

    const publicProbe = await openPage(`${productionLikeBaseUrl}?source=bigdiscoveries`, viewports[0]);
    await evalValue(publicProbe, `document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true`);
    const publicInitial = await evalValue(publicProbe, `(() => ({
      badgeText: (document.querySelector('.milestone-badge') || {}).textContent || '',
      betaWipCopyPresent: document.body.textContent.includes('BETA WIP') || document.body.textContent.includes('NOT LIVE'),
      debugControlsEnabled: document.body.classList.contains('debug-controls-enabled'),
      rewardReviewEnabled: document.body.classList.contains('reward-review-enabled'),
      p0ButtonHidden: document.getElementById('devP0Btn') ? getComputedStyle(document.getElementById('devP0Btn')).display === 'none' : false,
      p1AutoButtonHidden: document.getElementById('devP1AutoBtn') ? getComputedStyle(document.getElementById('devP1AutoBtn')).display === 'none' : false,
      p1AutoButtonText: document.getElementById('devP1AutoBtn') ? document.getElementById('devP1AutoBtn').textContent.trim() : '',
      p1AutoButtonAudienceClass: document.getElementById('devP1AutoBtn') ? document.getElementById('devP1AutoBtn').classList.contains('auto-play-btn') : false,
      rewardButtonHidden: document.getElementById('devRewardDieBtn') ? getComputedStyle(document.getElementById('devRewardDieBtn')).display === 'none' : false,
      discoButtonHidden: document.getElementById('devDiscoBtn') ? getComputedStyle(document.getElementById('devDiscoBtn')).display === 'none' : false,
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
    assert(publicInitial.debugControlsEnabled === false && publicInitial.rewardReviewEnabled === true && publicInitial.p0ButtonHidden === true && publicInitial.p1AutoButtonHidden === true && publicInitial.p1AutoButtonText === 'AUTO' && publicInitial.p1AutoButtonAudienceClass === true && publicInitial.rewardButtonHidden === true && publicInitial.discoButtonHidden === true && publicInitial.outcomeButtonsHidden === true, `public probe: hidden pre-play controls should include the audience-facing AUTO control while reward review is armed ${JSON.stringify(publicInitial)}`);
    assert(publicInitial.qaHooksPresent === false, `public probe: QA hooks should not install without qa/qa-hooks ${JSON.stringify(publicInitial)}`);
    assert(publicInitial.guidanceVisible === false, `public probe: legacy guidance should not show on desktop ${JSON.stringify(publicInitial)}`);
    await evalValue(publicProbe, `document.getElementById('startBtn').click(); true`);
    await waitEval(publicProbe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, 'public probe game start');
    const publicActive = await evalValue(publicProbe, `(() => ({
      debugControlsEnabled: document.body.classList.contains('debug-controls-enabled'),
      rewardReviewEnabled: document.body.classList.contains('reward-review-enabled'),
      p0ButtonHidden: document.getElementById('devP0Btn') ? getComputedStyle(document.getElementById('devP0Btn')).display === 'none' : false,
      p1AutoButtonVisible: document.getElementById('devP1AutoBtn') ? getComputedStyle(document.getElementById('devP1AutoBtn')).display !== 'none' : false,
      p1AutoButtonText: document.getElementById('devP1AutoBtn') ? document.getElementById('devP1AutoBtn').textContent.trim() : '',
      p1AutoButtonAudienceClass: document.getElementById('devP1AutoBtn') ? document.getElementById('devP1AutoBtn').classList.contains('auto-play-btn') : false,
      rewardButtonVisible: document.getElementById('devRewardDieBtn') ? getComputedStyle(document.getElementById('devRewardDieBtn')).display !== 'none' : false,
      discoButtonVisible: document.getElementById('devDiscoBtn') ? getComputedStyle(document.getElementById('devDiscoBtn')).display !== 'none' : false,
      outcomeButtonsHidden: document.getElementById('debugOutcomeControls') ? getComputedStyle(document.getElementById('debugOutcomeControls')).display === 'none' : false,
      gameStarted: document.body.dataset.gameStarted === 'true'
    }))()`);
    assert(publicActive.gameStarted === true, `public probe: game did not start ${JSON.stringify(publicActive)}`);
    assert(publicActive.debugControlsEnabled === false && publicActive.rewardReviewEnabled === true && publicActive.p0ButtonHidden === true && publicActive.p1AutoButtonVisible === true && publicActive.p1AutoButtonText === 'AUTO' && publicActive.p1AutoButtonAudienceClass === true && publicActive.rewardButtonVisible === true && publicActive.discoButtonVisible === true && publicActive.outcomeButtonsHidden === true, `public probe: AUTO and reward review should show during public play ${JSON.stringify(publicActive)}`);

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

    const p1AutoProbe = await openPage(`${baseUrl}?source=qa&qa=1`, viewports[0]);
    await evalValue(p1AutoProbe, `document.getElementById('startBtn').click(); true`);
    await waitEval(p1AutoProbe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, 'P1 auto probe game start');
    const p1AutoOn = await evalValue(p1AutoProbe, `(() => {
      const btn = document.getElementById('devP1AutoBtn');
      const before = window.TrashDiceQA.state();
      btn.click();
      const qa = window.TrashDiceQA.state();
      return {
        before,
        buttonText: btn.textContent.trim(),
        ariaPressed: btn.getAttribute('aria-pressed'),
        p1Autoplay: qa.p1Autoplay,
        p0Autoplay: qa.p0Autoplay,
        p0ReviewMode: qa.p0ReviewMode,
        p1AutoButtonVisible: qa.p1AutoButtonVisible,
        firstGameAssistActive: qa.firstGameAssist.active,
        firstGameAssistUses: qa.firstGameAssist.uses,
        bodyP1Auto: document.body.classList.contains('debug-p1-auto'),
        bodyAutoActive: document.body.classList.contains('auto-play-active')
      };
    })()`);
    assert(p1AutoOn.before.firstGameAssist.active === true, `AUTO probe: first-game assists should be eligible before autoplay starts ${JSON.stringify(p1AutoOn)}`);
    assert(p1AutoOn.buttonText === 'AUTO ON' && p1AutoOn.ariaPressed === 'true', `AUTO probe: button did not switch on ${JSON.stringify(p1AutoOn)}`);
    assert(p1AutoOn.p1Autoplay === true && p1AutoOn.p0Autoplay === false && p1AutoOn.p0ReviewMode === false, `AUTO probe: wrong autoplay mode after enabling ${JSON.stringify(p1AutoOn)}`);
    assert(p1AutoOn.p1AutoButtonVisible === true && p1AutoOn.bodyP1Auto === true && p1AutoOn.bodyAutoActive === true, `AUTO probe: button/body state missing after enable ${JSON.stringify(p1AutoOn)}`);
    await waitEval(p1AutoProbe, `window.TrashDiceQA.state().totalRolls >= 3`, 'P1 auto probe natural game rolls', 12000);
    const p1AutoProgress = await evalValue(p1AutoProbe, `(() => {
      const qa = window.TrashDiceQA.state();
      return {
        totalRolls: qa.totalRolls,
        current: qa.current,
        round: qa.round,
        p1Autoplay: qa.p1Autoplay,
        p0Autoplay: qa.p0Autoplay,
        p0ReviewMode: qa.p0ReviewMode,
        firstGameAssistActive: qa.firstGameAssist.active,
        firstGameAssistUses: qa.firstGameAssist.uses,
        firstGameAssistMaxUses: qa.firstGameAssist.maxUses,
        inlineGameOver: !!(qa.inlineGameOver && qa.inlineGameOver.active),
        message: (document.getElementById('message') || {}).textContent || ''
      };
    })()`);
    assert(p1AutoProgress.totalRolls >= 3 && p1AutoProgress.p1Autoplay === true && p1AutoProgress.p0Autoplay === false && p1AutoProgress.p0ReviewMode === false, `AUTO probe: natural player-vs-CPU autoplay did not advance correctly ${JSON.stringify(p1AutoProgress)}`);
    assert(p1AutoProgress.firstGameAssistActive === true || p1AutoProgress.firstGameAssistUses > 0, `AUTO probe: autoplay should preserve first-game assist eligibility/usage ${JSON.stringify(p1AutoProgress)}`);
    const p1AutoTerminal = await evalValue(p1AutoProbe, `(() => {
      const before = window.TrashDiceQA.state();
      window.TrashDiceDebug.win();
      const qa = window.TrashDiceQA.state();
      const btn = document.getElementById('devP1AutoBtn');
      return {
        before,
        buttonText: btn.textContent.trim(),
        ariaPressed: btn.getAttribute('aria-pressed'),
        p1Autoplay: qa.p1Autoplay,
        p0Autoplay: qa.p0Autoplay,
        p0ReviewMode: qa.p0ReviewMode,
        inlineGameOver: qa.inlineGameOver,
        completedGames: qa.completedGames,
        bodyAutoActive: document.body.classList.contains('auto-play-active')
      };
    })()`);
    assert(p1AutoTerminal.p1Autoplay === true && p1AutoTerminal.p0Autoplay === false && p1AutoTerminal.p0ReviewMode === false, `AUTO probe: terminal screen should preserve AUTO mode ${JSON.stringify(p1AutoTerminal)}`);
    assert(p1AutoTerminal.buttonText === 'AUTO ON' && p1AutoTerminal.ariaPressed === 'true' && p1AutoTerminal.bodyAutoActive === true, `AUTO probe: terminal screen should keep AUTO armed visually ${JSON.stringify(p1AutoTerminal)}`);
    assert(p1AutoTerminal.inlineGameOver && p1AutoTerminal.inlineGameOver.active === true && p1AutoTerminal.inlineGameOver.autoContinue === true && p1AutoTerminal.inlineGameOver.autoRestartMs > 0, `AUTO probe: terminal screen did not arm auto-continue restart ${JSON.stringify(p1AutoTerminal)}`);
    await waitEval(p1AutoProbe, `(() => {
      const qa = window.TrashDiceQA.state();
      return qa.gameStarted === true && qa.p1Autoplay === true && !qa.inlineGameOver && qa.totalRolls >= 1;
    })()`, 'AUTO probe auto-continue next game', 9000);
    const p1AutoAfterContinue = await evalValue(p1AutoProbe, `(() => {
      const qa = window.TrashDiceQA.state();
      const btn = document.getElementById('devP1AutoBtn');
      return {
        totalRolls: qa.totalRolls,
        current: qa.current,
        round: qa.round,
        p1Autoplay: qa.p1Autoplay,
        p0Autoplay: qa.p0Autoplay,
        p0ReviewMode: qa.p0ReviewMode,
        inlineGameOver: !!(qa.inlineGameOver && qa.inlineGameOver.active),
        completedGames: qa.completedGames,
        buttonText: btn.textContent.trim(),
        ariaPressed: btn.getAttribute('aria-pressed'),
        bodyAutoActive: document.body.classList.contains('auto-play-active')
      };
    })()`);
    assert(p1AutoAfterContinue.p1Autoplay === true && p1AutoAfterContinue.p0Autoplay === false && p1AutoAfterContinue.p0ReviewMode === false && p1AutoAfterContinue.inlineGameOver === false, `AUTO probe: auto-continue did not restart cleanly ${JSON.stringify(p1AutoAfterContinue)}`);
    assert(p1AutoAfterContinue.totalRolls >= 1 && p1AutoAfterContinue.buttonText === 'AUTO ON' && p1AutoAfterContinue.ariaPressed === 'true' && p1AutoAfterContinue.bodyAutoActive === true, `AUTO probe: autoplay did not resume after auto-continue restart ${JSON.stringify(p1AutoAfterContinue)}`);
    const p1AutoOff = await evalValue(p1AutoProbe, `(() => {
      const btn = document.getElementById('devP1AutoBtn');
      btn.click();
      const qa = window.TrashDiceQA.state();
      return {
        buttonText: btn.textContent.trim(),
        ariaPressed: btn.getAttribute('aria-pressed'),
        p1Autoplay: qa.p1Autoplay,
        p0Autoplay: qa.p0Autoplay,
        p1AutoButtonVisible: qa.p1AutoButtonVisible,
        bodyAutoActive: document.body.classList.contains('auto-play-active')
      };
    })()`);
    assert(p1AutoOff.buttonText === 'AUTO' && p1AutoOff.ariaPressed === 'false' && p1AutoOff.p1Autoplay === false && p1AutoOff.p0Autoplay === false && p1AutoOff.p1AutoButtonVisible === true && p1AutoOff.bodyAutoActive === false, `AUTO probe: button did not stop cleanly ${JSON.stringify(p1AutoOff)}`);

    const p1AutoBuffAudit = await evalValue(p1AutoProbe, `window.TrashDiceQA.p1AutoRollBuffAuditProbe()`);
    const p1AutoBuffCases = [
      p1AutoBuffAudit.firstRoundGuard,
      p1AutoBuffAudit.firstGameAssist,
      p1AutoBuffAudit.firstGameMiracle,
      p1AutoBuffAudit.openingComeback,
      p1AutoBuffAudit.postLossComeback,
      p1AutoBuffAudit.lastOpenSlot,
      p1AutoBuffAudit.lastOpenSlotSpinoff,
      p1AutoBuffAudit.enduranceAssist
    ];
    assert(p1AutoBuffAudit.p1AutoMode === true && p1AutoBuffAudit.allPlayerBuffs.length === 8, `P1 auto buff audit: missing expected player buff coverage ${JSON.stringify(p1AutoBuffAudit)}`);
    assert(p1AutoBuffCases.every(item => item && item.p1Autoplay === true && item.p0Autoplay === false && item.p0ReviewMode === false), `P1 auto buff audit: a buff case did not run under P1 Auto-only state ${JSON.stringify(p1AutoBuffAudit)}`);
    assert(p1AutoBuffAudit.firstRoundGuard.contexts.firstRoundGuardActive === true && p1AutoBuffAudit.firstRoundGuard.after.firstRoundGuardRolls > p1AutoBuffAudit.firstRoundGuard.before.firstRoundGuardRolls && p1AutoBuffAudit.firstRoundGuard.openHits === p1AutoBuffAudit.firstRoundGuard.samples.length, `P1 auto buff audit: first-round guard did not fire for P1 Auto ${JSON.stringify(p1AutoBuffAudit.firstRoundGuard)}`);
    assert(p1AutoBuffAudit.firstGameAssist.contexts.firstGameAssist.active === true && p1AutoBuffAudit.firstGameAssist.after.firstGameAssistUses > p1AutoBuffAudit.firstGameAssist.before.firstGameAssistUses && p1AutoBuffAudit.firstGameAssist.openHits > p1AutoBuffAudit.firstGameAssist.takenHits, `P1 auto buff audit: first-game assist did not fire for P1 Auto ${JSON.stringify(p1AutoBuffAudit.firstGameAssist)}`);
    assert(p1AutoBuffAudit.firstGameMiracle.contexts.firstGameMiracle.active === true && p1AutoBuffAudit.firstGameMiracle.after.firstGameMiracleRolls > p1AutoBuffAudit.firstGameMiracle.before.firstGameMiracleRolls && p1AutoBuffAudit.firstGameMiracle.openHits === p1AutoBuffAudit.firstGameMiracle.samples.length, `P1 auto buff audit: first-game miracle did not force P1 Auto open-slot hits ${JSON.stringify(p1AutoBuffAudit.firstGameMiracle)}`);
    assert(p1AutoBuffAudit.openingComeback.contexts.openingComebackAssistActive === true && p1AutoBuffAudit.openingComeback.after.openingComebackAssistRolls > p1AutoBuffAudit.openingComeback.before.openingComebackAssistRolls && p1AutoBuffAudit.openingComeback.openHits === p1AutoBuffAudit.openingComeback.samples.length, `P1 auto buff audit: opening comeback did not fire for P1 Auto ${JSON.stringify(p1AutoBuffAudit.openingComeback)}`);
    assert(p1AutoBuffAudit.postLossComeback.before.postLossComebackRound.active === true && p1AutoBuffAudit.postLossComeback.after.postLossComebackRound.rolls >= p1AutoBuffAudit.postLossComeback.samples.length && p1AutoBuffAudit.postLossComeback.openHits === p1AutoBuffAudit.postLossComeback.samples.length, `P1 auto buff audit: post-loss comeback did not fire for P1 Auto ${JSON.stringify(p1AutoBuffAudit.postLossComeback)}`);
    assert(p1AutoBuffAudit.lastOpenSlot.events.lastOpenSlotBuffUses === p1AutoBuffAudit.lastOpenSlot.samples.length && p1AutoBuffAudit.lastOpenSlot.events.lastOpenSlotBuffHits > 0 && p1AutoBuffAudit.lastOpenSlot.events.lastOpenSlotBuffMisses > 0 && p1AutoBuffAudit.lastOpenSlot.hitRate >= 0.38 && p1AutoBuffAudit.lastOpenSlot.hitRate <= 0.5, `P1 auto buff audit: last-open-slot buff did not stay active and missable for P1 Auto ${JSON.stringify(p1AutoBuffAudit.lastOpenSlot)}`);
    assert(p1AutoBuffAudit.lastOpenSlotSpinoff.events.lastOpenSlotBuffUses === p1AutoBuffAudit.lastOpenSlotSpinoff.samples.length && p1AutoBuffAudit.lastOpenSlotSpinoff.events.lastOpenSlotStages['spinoff-clutch'] === p1AutoBuffAudit.lastOpenSlotSpinoff.samples.length && p1AutoBuffAudit.lastOpenSlotSpinoff.hitRate >= 0.7 && p1AutoBuffAudit.lastOpenSlotSpinoff.hitRate <= 0.82, `P1 auto buff audit: last-open-slot spinoff clutch did not activate after stall threshold ${JSON.stringify(p1AutoBuffAudit.lastOpenSlotSpinoff)}`);
    assert(p1AutoBuffAudit.enduranceAssist.contexts.enduranceAssist.active === true && p1AutoBuffAudit.enduranceAssist.events.enduranceAssistUses > 0 && p1AutoBuffAudit.enduranceAssist.hitRate > 0.38, `P1 auto buff audit: endurance assist did not fire for P1 Auto ${JSON.stringify(p1AutoBuffAudit.enduranceAssist)}`);

    const openingGuardProbe = await openPage(`${baseUrl}?source=qa&qa=1`, viewports[0]);
    await evalValue(openingGuardProbe, `document.getElementById('startBtn').click(); true`);
    await waitEval(openingGuardProbe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, 'opening sweep guard probe game start');
    const openingGuard = await evalValue(openingGuardProbe, `(() => {
      const config = { round: 3, totalRolls: 0, p1Wins: 0, p2Wins: 2, p1Dice: 12, p2Dice: 12, openSlots: [2, 5], samples: 80 };
      const player = window.TrashDiceQA.enduranceAssistProbe({ ...config, player: 'p1' });
      const cpu = window.TrashDiceQA.enduranceAssistProbe({ ...config, player: 'p2' });
      return {
        player,
        cpu,
        playerFaces: Object.keys(player.counts).map(Number).sort((a, b) => a - b),
        cpuFaces: Object.keys(cpu.counts).map(Number).sort((a, b) => a - b)
      };
    })()`);
    const openingOpenSlots = openingGuard.player.openSlots.map(Number);
    assert(openingGuard.player.openingComebackAssistActive === true && openingGuard.cpu.openingComebackAssistActive === true, `opening sweep guard probe: danger window inactive ${JSON.stringify(openingGuard)}`);
    assert(openingGuard.playerFaces.length > 0 && openingGuard.playerFaces.every(face => openingOpenSlots.includes(face)), `opening sweep guard probe: player can miss open slots after two opening losses ${JSON.stringify(openingGuard)}`);
    assert(openingGuard.cpuFaces.length > 0 && openingGuard.cpuFaces.every(face => !openingOpenSlots.includes(face)), `opening sweep guard probe: CPU can still take open slots after two opening wins ${JSON.stringify(openingGuard)}`);

    const laterAssist = await evalValue(openingGuardProbe, `(() => {
      const summarize = probe => ({
        context: probe.context,
        openSlots: probe.openSlots.map(Number),
        faces: Object.keys(probe.counts).map(Number).sort((a, b) => a - b),
        counts: probe.counts
      });
      const lateNeutral = summarize(window.TrashDiceQA.enduranceAssistProbe({
        round: 7, totalRolls: 56, p1Wins: 3, p2Wins: 3, p1Dice: 10, p2Dice: 10, openSlots: [2], samples: 180, player: 'p2'
      }));
      const deficitPlayer = summarize(window.TrashDiceQA.enduranceAssistProbe({
        round: 6, totalRolls: 50, p1Wins: 1, p2Wins: 3, p1Dice: 7, p2Dice: 11, openSlots: [2, 5], samples: 140, player: 'p1'
      }));
      const deficitCpu = summarize(window.TrashDiceQA.enduranceAssistProbe({
        round: 6, totalRolls: 50, p1Wins: 1, p2Wins: 3, p1Dice: 7, p2Dice: 11, openSlots: [2], samples: 220, player: 'p2'
      }));
      const pressurePlayer = summarize(window.TrashDiceQA.enduranceAssistProbe({
        round: 8, totalRolls: 60, p1Wins: 2, p2Wins: 2, p1Dice: 5, p2Dice: 5, openSlots: [4], samples: 120, player: 'p1'
      }));
      return { lateNeutral, deficitPlayer, deficitCpu, pressurePlayer };
    })()`);
    assert(laterAssist.lateNeutral.context.active === false && laterAssist.lateNeutral.context.needsHelp === false && laterAssist.lateNeutral.context.assistanceTier === 'none', `later assist probe: neutral late play should not activate help ${JSON.stringify(laterAssist.lateNeutral)}`);
    assert(laterAssist.lateNeutral.faces.some(face => laterAssist.lateNeutral.openSlots.includes(face)) && laterAssist.lateNeutral.faces.some(face => !laterAssist.lateNeutral.openSlots.includes(face)), `later assist probe: CPU should not be hard-braked by neutral late play ${JSON.stringify(laterAssist.lateNeutral)}`);
    assert(laterAssist.deficitPlayer.context.active === true && laterAssist.deficitPlayer.context.needsHelp === true && laterAssist.deficitPlayer.context.behind === true && laterAssist.deficitPlayer.context.assistanceTier === 'deficit', `later assist probe: player deficit should activate contextual soft help ${JSON.stringify(laterAssist.deficitPlayer)}`);
    assert(laterAssist.deficitPlayer.faces.some(face => laterAssist.deficitPlayer.openSlots.includes(face)), `later assist probe: deficit player should retain open-slot help chance ${JSON.stringify(laterAssist.deficitPlayer)}`);
    assert(laterAssist.deficitCpu.context.active === true && laterAssist.deficitCpu.context.assistanceTier === 'deficit', `later assist probe: CPU deficit brake context inactive ${JSON.stringify(laterAssist.deficitCpu)}`);
    assert(laterAssist.deficitCpu.faces.some(face => laterAssist.deficitCpu.openSlots.includes(face)) && laterAssist.deficitCpu.faces.some(face => !laterAssist.deficitCpu.openSlots.includes(face)), `later assist probe: CPU later-session brake should stay soft, not a hard no-streak cap ${JSON.stringify(laterAssist.deficitCpu)}`);
    assert(laterAssist.pressurePlayer.context.active === true && laterAssist.pressurePlayer.context.pressure === true && laterAssist.pressurePlayer.context.behind === false && laterAssist.pressurePlayer.context.assistanceTier === 'pressure', `later assist probe: late low-dice pressure should activate contextual soft help without requiring CPU streak logic ${JSON.stringify(laterAssist.pressurePlayer)}`);

    const lastOpenSlotBuff = await evalValue(openingGuardProbe, `window.TrashDiceQA.lastOpenSlotPlayerBuffProbe({ samples: 600, openFace: 4 })`);
    assert(lastOpenSlotBuff.chance >= 0.4 && lastOpenSlotBuff.chance <= 0.5, `last-open-slot buff probe: player buff should be meaningful but not guaranteed ${JSON.stringify(lastOpenSlotBuff)}`);
    assert(lastOpenSlotBuff.player.hitRate >= 0.38 && lastOpenSlotBuff.player.hitRate <= 0.5 && lastOpenSlotBuff.player.hitRate > lastOpenSlotBuff.fairChance * 2.2, `last-open-slot buff probe: player hit rate should rise clearly above fair dice odds ${JSON.stringify(lastOpenSlotBuff)}`);
    assert(lastOpenSlotBuff.player.openHits > 0 && lastOpenSlotBuff.player.openMisses > 0 && lastOpenSlotBuff.player.buffUses === lastOpenSlotBuff.samples && lastOpenSlotBuff.player.buffHits === lastOpenSlotBuff.player.openHits && lastOpenSlotBuff.player.buffMisses === lastOpenSlotBuff.player.openMisses, `last-open-slot buff probe: player buff should be once-per-fresh-round and still missable ${JSON.stringify(lastOpenSlotBuff)}`);
    assert(lastOpenSlotBuff.cpu.hitRate >= 0.13 && lastOpenSlotBuff.cpu.hitRate <= 0.2 && lastOpenSlotBuff.cpu.buffUses === 0 && lastOpenSlotBuff.cpu.openHits > 0 && lastOpenSlotBuff.cpu.openMisses > 0, `last-open-slot buff probe: CPU should stay on fair unbuffed die odds ${JSON.stringify(lastOpenSlotBuff)}`);
    assert(lastOpenSlotBuff.spinoffThreshold === 6 && lastOpenSlotBuff.spinoffChance === 0.75 && lastOpenSlotBuff.spinoffEscalatedChance === 0.9, `last-open-slot buff probe: spinoff constants drifted ${JSON.stringify(lastOpenSlotBuff)}`);
    assert(lastOpenSlotBuff.spinoff.hitRate >= 0.7 && lastOpenSlotBuff.spinoff.hitRate <= 0.82 && lastOpenSlotBuff.spinoff.buffUses === lastOpenSlotBuff.samples && lastOpenSlotBuff.spinoff.stages['spinoff-clutch'] === lastOpenSlotBuff.samples && lastOpenSlotBuff.spinoff.buffHits > lastOpenSlotBuff.player.buffHits, `last-open-slot buff probe: stalled spinoff should strongly buff player ${JSON.stringify(lastOpenSlotBuff.spinoff)}`);
    assert(lastOpenSlotBuff.escalated.hitRate >= 0.86 && lastOpenSlotBuff.escalated.hitRate <= 0.94 && lastOpenSlotBuff.escalated.buffUses === lastOpenSlotBuff.samples && lastOpenSlotBuff.escalated.stages['spinoff-clutch-escalated'] === lastOpenSlotBuff.samples && lastOpenSlotBuff.escalated.buffHits > lastOpenSlotBuff.spinoff.buffHits, `last-open-slot buff probe: escalated spinoff should nearly end the duel for player ${JSON.stringify(lastOpenSlotBuff.escalated)}`);
    assert(lastOpenSlotBuff.cpuSpinoff.hitRate >= 0.13 && lastOpenSlotBuff.cpuSpinoff.hitRate <= 0.2 && lastOpenSlotBuff.cpuSpinoff.buffUses === 0 && lastOpenSlotBuff.cpuSpinoff.openHits > 0 && lastOpenSlotBuff.cpuSpinoff.openMisses > 0, `last-open-slot buff probe: CPU should stay unbuffed after spinoff threshold ${JSON.stringify(lastOpenSlotBuff.cpuSpinoff)}`);
    assert(lastOpenSlotBuff.repeat.firstBuff && lastOpenSlotBuff.repeat.usedAfterFirst === true && lastOpenSlotBuff.repeat.secondBuff === null && lastOpenSlotBuff.repeat.usedAfterSecond === true, `last-open-slot buff probe: player base buff should not fire twice before stall threshold ${JSON.stringify(lastOpenSlotBuff.repeat)}`);

    for (const winner of ['p1', 'p2']) {
      const roundWinProbe = await openPage(`${baseUrl}?source=qa&qa=1`, viewports[0]);
      await evalValue(roundWinProbe, `document.getElementById('startBtn').click(); true`);
      await waitEval(roundWinProbe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, `${winner} round-win probe game start`);
      const roundWinEarly = await evalValue(roundWinProbe, `window.TrashDiceDebug.roundWinEventProbe(${JSON.stringify(winner)})`);
      let roundWinProbeElapsedMs = 180;
      const fontSize = parseFloat(roundWinEarly.payoutStatusFontSize || '0');
      const expectedRoundWinnerLabel = winner === 'p2' ? 'CPU WINNER' : 'WINNER';
      assert(roundWinEarly.winner === winner, `${winner} round-win probe: wrong winner ${JSON.stringify(roundWinEarly)}`);
      assert(roundWinEarly.payoutStatusActive === true && roundWinEarly.roundWinnerStatusActive === true, `${winner} round-win probe: winner status inactive ${JSON.stringify(roundWinEarly)}`);
      assert(roundWinEarly.roundWinnerStatusPlayer === winner && roundWinEarly.roundWinnerStatusText === expectedRoundWinnerLabel && roundWinEarly.payoutStatusText === expectedRoundWinnerLabel, `${winner} round-win probe: winner status text missing ${JSON.stringify(roundWinEarly)}`);
      assert(roundWinEarly.claimBadgeText === `${expectedRoundWinnerLabel} +6`, `${winner} round-win probe: claim badge text wrong ${JSON.stringify(roundWinEarly)}`);
      assert(roundWinEarly.roundWinnerStatusLarge === true && fontSize >= 36, `${winner} round-win probe: winner status is not large enough ${JSON.stringify(roundWinEarly)}`);
      assert(roundWinEarly.winnerStatusDuration === roundWinEarly.spillDuration + 260, `${winner} round-win probe: winner status duration should track round resolution without extending it ${JSON.stringify(roundWinEarly)}`);
      if (winner === 'p2') {
        assert(roundWinEarly.fullEvent === false && roundWinEarly.spillDuration === roundWinEarly.expectedCpuDuration, `green round-win probe: CPU round timing changed ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.titleFanfareActive === false, `green round-win probe: CPU round should not pulse the title logo ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.lidDance === false, `green round-win probe: CPU round should not pulse the lid payout panel ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.canDance === false, `green round-win probe: CPU round should not gain player-only can dance ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.statusChaseDieVisible === false && roundWinEarly.statusChaseDieName === '', `green round-win probe: CPU winner pill should not show the player's chase die ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.payoutPanelActive === false && roundWinEarly.payoutInventoryActive === false && roundWinEarly.payoutComets === 0, `green round-win probe: CPU round should not gain player payout fanfare ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.roundWinBurstVisible === false && roundWinEarly.rewardDieVisible === false && roundWinEarly.rewardDieState.totalWins === 0, `green round-win probe: CPU round should not trigger player reward fanfare ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.roundLossRewardNudgeVisible === true, `green round-win probe: player round-loss reward nudge missing ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.roundLossRewardNudgeText.includes('CURRENT SKIN: DEFAULT') && roundWinEarly.roundLossRewardNudgeText.includes('NEXT SKIN IN 1 ROUND WIN:') && roundWinEarly.roundLossRewardNudgeText.includes(rewardFirst.name) && !roundWinEarly.roundLossRewardNudgeText.includes(`${rewardFirst.name} DIE SKIN`), `green round-win probe: player round-loss reward nudge copy wrong ${JSON.stringify({ rewardFirst, roundWinEarly })}`);
        assert(roundWinEarly.roundLossRewardNudgeNextName === rewardFirst.name && roundWinEarly.roundLossRewardNudgeRoundsNeeded === '1' && roundWinEarly.roundLossRewardNudgePreview === 'next', `green round-win probe: player round-loss reward nudge milestone metadata wrong ${JSON.stringify({ rewardFirst, roundWinEarly })}`);
        assert(roundWinEarly.roundLossRewardNudgeFitsViewport === true, `green round-win probe: player round-loss reward nudge should fit viewport ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.roundLossRewardNudgeLayout === 'player-panel-dock' && roundWinEarly.roundLossRewardNudgeOverlapsRoll === false && roundWinEarly.roundLossRewardNudgeDockedToPlayerPanel === true, `green round-win probe: KEEP ROLLING should dock to the player pile panel without covering Roll ${JSON.stringify(roundWinEarly)}`);
        await sleep(760);
        roundWinProbeElapsedMs += 760;
        const cpuPayoutMotion = await evalValue(roundWinProbe, `(() => {
          const panel = document.getElementById('p2Inventory').closest('.player-panel');
          return {
            lidDance: document.getElementById('boardWrap').classList.contains('player-payout-lid-dance'),
            panelTick: !!(panel && panel.classList.contains('payout-tick')),
            poolTick: document.getElementById('p2Pool').classList.contains('payout-tick')
          };
        })()`);
        assert(cpuPayoutMotion.lidDance === false && cpuPayoutMotion.panelTick === false && cpuPayoutMotion.poolTick === false, `green round-win probe: CPU payout panel/count pulse should stay quiet ${JSON.stringify({ roundWinEarly, cpuPayoutMotion })}`);
      } else {
        assert(roundWinEarly.fullEvent === true && roundWinEarly.payoutPanelActive === true && roundWinEarly.payoutInventoryActive === true, `yellow round-win probe: player payout fanfare missing ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.lidDance === true, `yellow round-win probe: player payout lid dance missing ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.titleFanfareActive === true, `yellow round-win probe: player round should still pulse the title logo ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.roundWinnerStatusSuppressChaseDie === true, `yellow round-win probe: unlock round should suppress the lower winner-pill chase die ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.statusChaseDieVisible === false && roundWinEarly.statusChaseDieName === '', `yellow round-win probe: unlock round should not show the next chase die in the lower winner pill ${JSON.stringify({ rewardSecond, roundWinEarly })}`);
        assert(roundWinEarly.roundWinBurstVisible === true && roundWinEarly.roundWinBurstText.includes('ROUND') && roundWinEarly.roundWinBurstText.includes('WINNER'), `yellow round-win probe: ROUND WINNER burst missing ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.roundWinBurstRewardTier === String(rewardFirst.tier) && roundWinEarly.roundWinBurstRewardName === rewardFirst.name, `yellow round-win probe: first round win should attach first active reward to burst ${JSON.stringify({ rewardFirst, roundWinEarly })}`);
        assert(roundWinEarly.roundWinBurstDieVisible === true && roundWinEarly.roundWinBurstDieName === rewardFirst.name && roundWinEarly.roundWinBurstDieEffect === rewardFirst.effect, `yellow round-win probe: ROUND WINNER burst should show the reward die visual ${JSON.stringify({ rewardFirst, roundWinEarly })}`);
        assert(roundWinEarly.roundWinBurstPreviewTier === String(rewardFirst.tier) && roundWinEarly.roundWinBurstPreviewName === rewardFirst.name, `yellow round-win probe: ROUND WINNER burst preview metadata wrong ${JSON.stringify({ rewardFirst, roundWinEarly })}`);
        assert(roundWinEarly.roundWinBurstText.includes('DIE SKIN UNLOCKED'), `yellow round-win probe: reward burst should describe die skin unlock ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.rewardDieVisible === false, `yellow round-win probe: reward die reveal should wait until ROUND WIN reads ${JSON.stringify(roundWinEarly)}`);
        assert(roundWinEarly.rewardDieState.totalWins === 1 && roundWinEarly.rewardDieState.activeTier === 1 && roundWinEarly.rewardDieState.nextDie && roundWinEarly.rewardDieState.nextDie.minWins === 2, `yellow round-win probe: reward state should advance on player round win ${JSON.stringify(roundWinEarly.rewardDieState)}`);
        assert(roundWinEarly.roundLossRewardNudgeVisible === false, `yellow round-win probe: round-loss nudge should not show on player wins ${JSON.stringify(roundWinEarly)}`);
        await sleep(1450);
        roundWinProbeElapsedMs += 1450;
        const delayedRewardDie = await evalValue(roundWinProbe, `(() => {
        const shell = document.getElementById('rewardDieUnlock');
        const die = document.getElementById('rewardDie');
        const name = document.getElementById('rewardDieName');
        const sub = document.getElementById('rewardDieSub');
        const scene = shell ? shell.querySelector('.reward-die-scene') : null;
        const burstContent = document.querySelector('#roundWinBurst .round-win-burst-content');
        const roll = document.getElementById('rollBtn');
        const style = shell ? getComputedStyle(shell) : null;
        const rect = die ? die.getBoundingClientRect() : null;
        const sceneRect = scene ? scene.getBoundingClientRect() : null;
        const burstRect = burstContent ? burstContent.getBoundingClientRect() : null;
        const rollRect = roll ? roll.getBoundingClientRect() : null;
        const scrimStyle = shell ? getComputedStyle(shell, '::before') : null;
        const scrimMask = scrimStyle ? (scrimStyle.webkitMaskImage || scrimStyle.maskImage || '') : '';
        const scrimBottom = scrimStyle ? scrimStyle.bottom || '' : '';
        const toRect = r => r ? { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) } : null;
        const hasGap = sceneRect && burstRect
          ? (sceneRect.top >= burstRect.bottom + 4 || sceneRect.bottom <= burstRect.top - 4 || sceneRect.left >= burstRect.right + 4 || sceneRect.right <= burstRect.left - 4)
          : false;
        const clearsRoll = sceneRect && rollRect ? sceneRect.bottom <= rollRect.top - 4 : false;
        return {
          visible: !!(shell && die && !shell.hidden && shell.classList.contains('show') && style && style.display !== 'none' && parseFloat(style.opacity || '0') > 0 && rect && rect.width >= 48 && rect.height >= 48),
          tier: shell ? shell.dataset.tier || '' : '',
          layout: shell ? shell.dataset.layout || '' : '',
          name: name ? name.textContent || '' : '',
          sub: sub ? sub.textContent || '' : '',
          sceneRect: toRect(sceneRect),
          burstRect: toRect(burstRect),
          rollRect: toRect(rollRect),
          hasGap,
          clearsRoll,
          scrimBottom,
          scrimMaskImage: scrimMask,
          scrimMaskRepeat: scrimStyle ? (scrimStyle.webkitMaskRepeat || scrimStyle.maskRepeat || '') : ''
        };
      })()`);
        assert(delayedRewardDie.visible === true && delayedRewardDie.tier === String(rewardFirst.tier) && delayedRewardDie.name === rewardFirst.name, `yellow round-win probe: delayed first reward die reveal missing ${JSON.stringify({ rewardFirst, roundWinEarly, delayedRewardDie })}`);
        assert(delayedRewardDie.sub === 'DIE SKIN UNLOCKED', `yellow round-win probe: delayed reward reveal should include die skin unlocked subtitle ${JSON.stringify(delayedRewardDie)}`);
        assert(delayedRewardDie.layout === 'round-win-companion' && delayedRewardDie.hasGap === true && delayedRewardDie.clearsRoll === true, `yellow round-win probe: delayed reward reveal should dock between ROUND WINNER and Roll without overlap ${JSON.stringify(delayedRewardDie)}`);
        assert((delayedRewardDie.scrimMaskImage === 'none' || delayedRewardDie.scrimMaskImage === '') && (parseFloat(delayedRewardDie.scrimBottom || '0') || 0) === 0, `yellow round-win probe: reward scrim should cover the full viewport with no bottom feather gap ${JSON.stringify(delayedRewardDie)}`);
      }
      await sleep(Math.max(0, Math.min(roundWinEarly.fanfareDuration + 120, roundWinEarly.winnerStatusDuration - 120) - roundWinProbeElapsedMs));
      const roundWinAfterFanfare = await evalValue(roundWinProbe, `(() => {
        const id = ${JSON.stringify(winner === 'p1' ? 'p1StatusBar' : 'p2StatusBar')};
        const textId = ${JSON.stringify(winner === 'p1' ? 'p1StatusText' : 'p2StatusText')};
        const bar = document.getElementById(id);
        const text = document.getElementById(textId);
        const style = bar ? getComputedStyle(bar) : null;
        return {
          statusText: text ? text.textContent.trim() : '',
          payoutStatusActive: !!(bar && bar.classList.contains('payout-praise')),
          roundWinnerStatusLarge: !!(bar && bar.classList.contains('round-winner-praise')),
          fontSize: style ? style.fontSize : ''
        };
      })()`);
      assert(roundWinAfterFanfare.statusText === expectedRoundWinnerLabel && roundWinAfterFanfare.payoutStatusActive === true && roundWinAfterFanfare.roundWinnerStatusLarge === true, `${winner} round-win probe: winner status disappeared before fanfare window ended ${JSON.stringify({ roundWinEarly, roundWinAfterFanfare })}`);
      await sleep(3600);
      const postRewardHoldState = await evalValue(roundWinProbe, `(() => {
        const state = window.TrashDiceQA.state();
        const roll = document.getElementById('rollBtn');
        const burst = document.getElementById('roundWinBurst');
        const loss = document.getElementById('roundLossRewardNudge');
        const reward = document.getElementById('rewardDieUnlock');
        return {
          current: state.current,
          busy: state.busy,
          totalRolls: state.totalRolls,
          inlineGameOver: !!state.inlineGameOver,
          rollDisabled: !!(roll && roll.disabled),
          rollText: roll ? roll.textContent.trim() : '',
          burstHidden: !burst || burst.hidden,
          lossHidden: !loss || loss.hidden,
          rewardHidden: !reward || reward.hidden
        };
      })()`);
      assert(postRewardHoldState.current === 'p1' && postRewardHoldState.rollDisabled === false, `${winner} round-win probe roll not ready after reward hold ${JSON.stringify({ roundWinEarly, postRewardHoldState })}`);
      assert(postRewardHoldState.burstHidden === true && postRewardHoldState.lossHidden === true && postRewardHoldState.rewardHidden === true, `${winner} round-win probe result UI should quietly clear when the next round is ready ${JSON.stringify({ roundWinEarly, postRewardHoldState })}`);
      const rollGatedReward = await evalValue(roundWinProbe, `(() => {
        const burst = document.getElementById('roundWinBurst');
        const burstContent = burst ? burst.querySelector('.round-win-burst-content') : null;
        const loss = document.getElementById('roundLossRewardNudge');
        const rewardShell = document.getElementById('rewardDieUnlock');
        const rewardScene = rewardShell ? rewardShell.querySelector('.reward-die-scene') : null;
        const rewardDie = document.getElementById('rewardDie');
        const roll = document.getElementById('rollBtn');
        const visible = (el) => {
          const style = el ? getComputedStyle(el) : null;
          return !!(el && !el.hidden && el.classList.contains('show') && style && style.display !== 'none' && parseFloat(style.opacity || '0') > 0);
        };
        const toRect = (el) => {
          const rect = el ? el.getBoundingClientRect() : null;
          return rect ? { width: Math.round(rect.width), height: Math.round(rect.height), left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom) } : null;
        };
        const overlaps = (a, b) => !!(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
        const rewardSceneRect = toRect(rewardScene);
        const burstContentRect = toRect(burstContent);
        const rollRect = toRect(roll);
        const rewardShellStyle = rewardShell ? getComputedStyle(rewardShell) : null;
        const rewardScrimStyle = rewardShell ? getComputedStyle(rewardShell, '::before') : null;
        const rewardScrimBottom = rewardScrimStyle ? Math.round(parseFloat(rewardScrimStyle.bottom || '0')) : null;
        const rewardScrimClearTop = rewardScrimBottom !== null ? Math.round(window.innerHeight - rewardScrimBottom) : null;
        return {
          viewportHeight: Math.round(window.innerHeight),
          burstVisible: visible(burst),
          burstText: burst ? burst.textContent.replace(/\\s+/g, ' ').trim() : '',
          burstRect: toRect(burst),
          burstContentRect,
          lossVisible: visible(loss),
          lossText: loss ? loss.textContent.replace(/\\s+/g, ' ').trim() : '',
          lossRect: toRect(loss),
          rewardVisible: visible(rewardShell),
          rewardLayout: rewardShell ? rewardShell.dataset.layout || '' : '',
          rewardRect: toRect(rewardDie),
          rewardSceneRect,
          rewardScrimVar: rewardShellStyle ? rewardShellStyle.getPropertyValue('--reward-unlock-scrim').trim() : '',
          rewardScrimBottom,
          rewardScrimClearTop,
          rollRect,
          rewardOverlapsBurst: overlaps(rewardSceneRect, burstContentRect),
          rewardOverlapsRoll: overlaps(rewardSceneRect, rollRect),
          rewardName: (document.getElementById('rewardDieName') || {}).textContent || '',
          rewardSub: (document.getElementById('rewardDieSub') || {}).textContent || ''
        };
      })()`);
      assert(rollGatedReward.lossVisible === false && rollGatedReward.burstVisible === false && rollGatedReward.rewardVisible === false, `${winner} round-win probe: result/chase UI should not persist until Roll after quiet auto-advance ${JSON.stringify(rollGatedReward)}`);
      await evalValue(roundWinProbe, `document.getElementById('rollBtn').click(); true`);
      await waitEval(roundWinProbe, `(() => {
        const burst = document.getElementById('roundWinBurst');
        const loss = document.getElementById('roundLossRewardNudge');
        const reward = document.getElementById('rewardDieUnlock');
        return (!burst || burst.hidden || !burst.classList.contains('show')) &&
          (!loss || loss.hidden || !loss.classList.contains('show')) &&
          (!reward || reward.hidden || !reward.classList.contains('show'));
      })()`, `${winner} round-win probe reward UI clears on Roll`);
    }

    const lateSessionRoundLossProbe = await openPage(`${baseUrl}?source=qa&qa=1&round-loss-nudge=late-session`, viewports[0]);
    await evalValue(lateSessionRoundLossProbe, `document.getElementById('startBtn').click(); true`);
    await waitEval(lateSessionRoundLossProbe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, `late-session round-loss nudge probe game start`);
    await evalValue(lateSessionRoundLossProbe, `window.TrashDiceQA.setCompletedGames(3); window.TrashDiceQA.setRewardWins(6); true`);
    const lateSessionRoundLoss = await evalValue(lateSessionRoundLossProbe, `window.TrashDiceDebug.roundWinEventProbe('p2')`);
    assert(lateSessionRoundLoss.roundLossRewardNudgeVisible === true, `late-session round-loss nudge probe: player chase nudge should still show after multiple completed games ${JSON.stringify(lateSessionRoundLoss)}`);
    assert(lateSessionRoundLoss.roundLossRewardNudgeText.includes(`CURRENT SKIN: ${rewardAtSix.name}`) && lateSessionRoundLoss.roundLossRewardNudgeText.includes('NEXT SKIN IN 1 ROUND WIN:') && lateSessionRoundLoss.roundLossRewardNudgeText.includes(rewardNextAfterSix.name) && !lateSessionRoundLoss.roundLossRewardNudgeText.includes(`${rewardNextAfterSix.name} DIE SKIN`), `late-session round-loss nudge probe: chase nudge copy wrong after multiple completed games ${JSON.stringify({ rewardAtSix, rewardNextAfterSix, lateSessionRoundLoss })}`);
    assert(lateSessionRoundLoss.roundLossRewardNudgeNextName === rewardNextAfterSix.name && lateSessionRoundLoss.roundLossRewardNudgeRoundsNeeded === '1' && lateSessionRoundLoss.roundLossRewardNudgeTargetWins === String(rewardNextAfterSix.minWins) && lateSessionRoundLoss.roundLossRewardNudgeCopyMode === 'close' && lateSessionRoundLoss.roundLossRewardNudgePreview === 'next', `late-session round-loss nudge probe: chase nudge metadata wrong after multiple completed games ${JSON.stringify({ rewardNextAfterSix, lateSessionRoundLoss })}`);

    const cosmicAmbientRoundWinProbe = await openPage(`${baseUrl}?source=qa&qa=1&round-win-copy=cosmic-ambient`, viewports[0]);
    await evalValue(cosmicAmbientRoundWinProbe, `document.getElementById('startBtn').click(); true`);
    await waitEval(cosmicAmbientRoundWinProbe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, `COSMIC ambient round-win copy probe game start`);
    await evalValue(cosmicAmbientRoundWinProbe, `window.TrashDiceQA.setRewardWins(7); true`);
    const cosmicAmbientRoundWin = await evalValue(cosmicAmbientRoundWinProbe, `window.TrashDiceDebug.roundWinEventProbe('p1')`);
    assert(cosmicAmbientRoundWin.rewardDieState.totalWins === 8 && cosmicAmbientRoundWin.rewardDieState.activeName === 'DIAMOND' && cosmicAmbientRoundWin.rewardDieState.cosmicAmbientUnlocked === true && cosmicAmbientRoundWin.rewardDieState.nextDie && cosmicAmbientRoundWin.rewardDieState.nextDie.name === 'PRISM', `COSMIC ambient round-win copy probe: ambient state should unlock without changing die skin ${JSON.stringify(cosmicAmbientRoundWin.rewardDieState)}`);
    assert(cosmicAmbientRoundWin.roundWinBurstText.includes('COSMIC VIBES') && !cosmicAmbientRoundWin.roundWinBurstText.includes('DIE SKIN'), `COSMIC ambient round-win copy probe: ambient beat should not read like a die skin unlock ${JSON.stringify(cosmicAmbientRoundWin)}`);
    assert(cosmicAmbientRoundWin.roundWinBurstRewardName === '' && cosmicAmbientRoundWin.roundWinBurstPreviewName === 'DIAMOND' && cosmicAmbientRoundWin.roundWinBurstDieName === 'DIAMOND' && cosmicAmbientRoundWin.rewardDieVisible === false, `COSMIC ambient round-win copy probe: ambient beat should keep the DIAMOND skin visible and avoid DISCO die reveal ${JSON.stringify(cosmicAmbientRoundWin)}`);
    assert(cosmicAmbientRoundWin.roundWinBurstCopyMode === 'cosmic-ambient' && cosmicAmbientRoundWin.roundWinBurstTargetWins === '8', `COSMIC ambient round-win copy probe: ambient metadata wrong ${JSON.stringify(cosmicAmbientRoundWin)}`);
    await sleep(520);
    const cosmicAmbientSettled = await evalValue(cosmicAmbientRoundWinProbe, `(() => {
      const burst = document.getElementById('roundWinBurst');
      const die = document.getElementById('roundWinBurstDie');
      const style = burst ? getComputedStyle(burst) : null;
      const rect = burst ? burst.getBoundingClientRect() : null;
      const dieStyle = die ? getComputedStyle(die) : null;
      const dieRect = die ? die.getBoundingClientRect() : null;
      return {
        visible: !!(burst && !burst.hidden && burst.classList.contains('show') && style && style.display !== 'none' && parseFloat(style.opacity || '0') > 0),
        text: burst ? burst.textContent.replace(/\\s+/g, ' ').trim() : '',
        copyMode: burst ? burst.dataset.copyMode || '' : '',
        targetWins: burst ? burst.dataset.targetWins || '' : '',
        previewName: burst ? burst.dataset.previewName || '' : '',
        dieVisible: !!(die && !die.hidden && dieStyle && dieStyle.display !== 'none' && dieRect && dieRect.width >= 48 && dieRect.height >= 48),
        rect: rect ? { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) } : null
      };
    })()`);
    assert(cosmicAmbientSettled.visible === true && cosmicAmbientSettled.dieVisible === true && cosmicAmbientSettled.text.includes('COSMIC VIBES') && cosmicAmbientSettled.previewName === 'DIAMOND', `COSMIC ambient round-win copy probe: ambient beat should become visible after its entry animation starts ${JSON.stringify(cosmicAmbientSettled)}`);

    const mysteryFinalSkinProbe = await openPage(`${baseUrl}?source=qa&qa=1&round-loss-nudge=mystery-final`, viewports[0]);
    await evalValue(mysteryFinalSkinProbe, `document.getElementById('startBtn').click(); true`);
    await waitEval(mysteryFinalSkinProbe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, `mystery final skin nudge probe game start`);
    await evalValue(mysteryFinalSkinProbe, `window.TrashDiceQA.setRewardWins(11); true`);
    const mysteryFinalSkin = await evalValue(mysteryFinalSkinProbe, `window.TrashDiceDebug.roundWinEventProbe('p2')`);
    assert(mysteryFinalSkin.roundLossRewardNudgeText.includes('CURRENT SKIN: LAVA') && mysteryFinalSkin.roundLossRewardNudgeText.includes('NEXT SKIN IN 1 ROUND WIN:') && mysteryFinalSkin.roundLossRewardNudgeText.includes('MYSTERY FINAL SKIN'), `mystery final skin nudge probe: final cap should be teased as mystery copy before 12 ${JSON.stringify(mysteryFinalSkin)}`);
    assert(mysteryFinalSkin.roundLossRewardNudgeNextName === 'DISCO' && mysteryFinalSkin.roundLossRewardNudgePreview === 'current' && !mysteryFinalSkin.roundLossRewardNudgeText.includes('DISCO DIE SKIN'), `mystery final skin nudge probe: DISCO should not be promised as a visible die skin before cap ${JSON.stringify(mysteryFinalSkin)}`);
    await sleep(520);
    const mysteryFinalSkinSettled = await evalValue(mysteryFinalSkinProbe, `(() => {
      const nudge = document.getElementById('roundLossRewardNudge');
      const style = nudge ? getComputedStyle(nudge) : null;
      const rect = nudge ? nudge.getBoundingClientRect() : null;
      return {
        visible: !!(nudge && !nudge.hidden && nudge.classList.contains('show') && style && style.display !== 'none' && parseFloat(style.opacity || '0') > 0),
        text: nudge ? nudge.textContent.replace(/\\s+/g, ' ').trim() : '',
        preview: nudge ? nudge.dataset.preview || '' : '',
        nextName: nudge ? nudge.dataset.nextName || '' : '',
        rect: rect ? { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) } : null
      };
    })()`);
    assert(mysteryFinalSkinSettled.visible === true && mysteryFinalSkinSettled.text.includes('MYSTERY FINAL SKIN') && mysteryFinalSkinSettled.nextName === 'DISCO' && mysteryFinalSkinSettled.preview === 'current', `mystery final skin nudge probe: final mystery nudge should become visible after its entry animation starts ${JSON.stringify(mysteryFinalSkinSettled)}`);

    const cappedRoundWinsProbe = await openPage(`${baseUrl}?source=qa&qa=1&round-win-copy=capped`, viewports[0]);
    await evalValue(cappedRoundWinsProbe, `document.getElementById('startBtn').click(); true`);
    await waitEval(cappedRoundWinsProbe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, `capped round-win copy probe game start`);
    await evalValue(cappedRoundWinsProbe, `window.TrashDiceQA.setRewardWins(11); true`);
    const cappedRoundWins = await evalValue(cappedRoundWinsProbe, `window.TrashDiceDebug.roundWinEventProbe('p1')`);
    assert(cappedRoundWins.rewardDieState.totalWins === 12 && cappedRoundWins.rewardDieState.activeName === 'DISCO' && cappedRoundWins.rewardDieState.capped === true && cappedRoundWins.rewardDieState.guidedCompletionPending === true && cappedRoundWins.rewardDieState.guidedGameCompleted === false, `capped round-win copy probe: final DISCO state wrong ${JSON.stringify(cappedRoundWins.rewardDieState)}`);
    assert(cappedRoundWins.roundWinBurstText.includes('DISCO DIE SKIN UNLOCKED'), `capped round-win copy probe: should announce DISCO unlock ${JSON.stringify(cappedRoundWins)}`);
    assert(cappedRoundWins.roundWinBurstRewardName === 'DISCO' && cappedRoundWins.roundWinBurstCopyMode === 'capped' && cappedRoundWins.roundWinBurstTargetWins === '12', `capped round-win copy probe: final DISCO metadata wrong ${JSON.stringify(cappedRoundWins)}`);
    assert(!cappedRoundWins.roundWinBurstText.includes('ROUND WINS'), `capped round-win copy probe: old ROUND WINS wording leaked ${JSON.stringify(cappedRoundWins)}`);

    const beatGameWinProbe = await openPage(`${baseUrl}?source=qa&qa=1&guided-complete=game-win`, viewports[0]);
    await evalValue(beatGameWinProbe, `document.getElementById('startBtn').click(); true`);
    await waitEval(beatGameWinProbe, `document.body.dataset.gameStarted === 'true' && !document.getElementById('rollBtn').disabled`, `guided complete game-win probe game start`);
    await evalValue(beatGameWinProbe, `window.TrashDiceQA.setRewardWins(12); window.TrashDiceQA.setGuidedCompletion({ pending: true, completed: false, reason: 'qa-game-win' }); window.TrashDiceQA.gameWin('p1'); true`);
    await waitEval(beatGameWinProbe, `window.TrashDiceQA.state().inlineGameOver && window.TrashDiceQA.state().inlineGameOver.guidedCompletionTriggered === true`, `guided complete game-win probe terminal capstone`);
    await waitEval(beatGameWinProbe, `window.TrashDiceQA.roundWinsWindupState().complete === true && window.TrashDiceQA.roundWinsWindupState().finalWins === 12`, `guided complete game-win probe round counter`, 5000);
    const beatGameWinUi = await evalValue(beatGameWinProbe, `(() => {
      const logo = document.getElementById('inlineResultLogo');
      const logoRect = logo ? logo.getBoundingClientRect() : null;
      const logoStyle = logo ? getComputedStyle(logo) : null;
      const nudge = document.getElementById('terminalRewardNudge');
      const chip = document.getElementById('inlineResultChip');
      const chipText = document.getElementById('inlineResultChipText');
      return {
        state: window.TrashDiceQA.state().inlineGameOver,
        rewardState: window.TrashDiceQA.rewardDieState(),
        bodyGuidedClass: document.body.classList.contains('guided-game-complete'),
        title: (document.getElementById('inlineResultTitle') || {}).textContent.replace(/\\s+/g, ' ').trim(),
        sub: (document.getElementById('inlineResultSub') || {}).textContent.replace(/\\s+/g, ' ').trim(),
        logoVisible: !!(logo && !logo.hidden && logoStyle && logoStyle.display !== 'none' && logoRect && logoRect.width >= 120 && logoRect.height >= 48),
        terminalRewardVisible: !!(nudge && !nudge.hidden && getComputedStyle(nudge).display !== 'none'),
        chipVisible: !!(chip && !chip.hidden && getComputedStyle(chip).display !== 'none'),
        chipText: chipText ? chipText.textContent.replace(/\\s+/g, ' ').trim() : ''
      };
    })()`);
    assert(beatGameWinUi.state.guidedCompletionTriggered === true && beatGameWinUi.rewardState.guidedCompletionPending === false && beatGameWinUi.rewardState.guidedGameCompleted === true, `guided complete game-win probe: terminal game win should complete guided state ${JSON.stringify(beatGameWinUi)}`);
    assert(beatGameWinUi.bodyGuidedClass === true && beatGameWinUi.title === 'YOU BEAT THE GAME!' && beatGameWinUi.sub === 'You unlocked every die. How many more rounds can you win?' && beatGameWinUi.logoVisible === true, `guided complete game-win probe: terminal capstone should show headline, logo, and subcopy ${JSON.stringify(beatGameWinUi)}`);
    assert(beatGameWinUi.terminalRewardVisible === false && beatGameWinUi.chipVisible === true && /ROUNDS WON:\s*x12/.test(beatGameWinUi.chipText) && /GAMES WON:\s*1/.test(beatGameWinUi.chipText), `guided complete game-win probe: terminal capstone should suppress reward chase and keep round and game counters ${JSON.stringify(beatGameWinUi)}`);

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
        const roll = document.getElementById('rollBtn');
        const nudge = document.getElementById('terminalRewardNudge');
        const outcomeCard = document.getElementById('inlineResultBanner');
        const outcomeTitle = document.getElementById('inlineResultTitle');
        const outcomeSub = document.getElementById('inlineResultSub');
        const chip = document.getElementById('inlineResultChip');
        const chipText = document.getElementById('inlineResultChipText');
        const panel = document.getElementById('p1Inventory') ? document.getElementById('p1Inventory').closest('.player-panel') : null;
        const toRect = el => {
          const r = el ? el.getBoundingClientRect() : null;
          return r ? { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) } : null;
        };
        const rollRectRaw = roll ? roll.getBoundingClientRect() : null;
        const nudgeRectRaw = nudge ? nudge.getBoundingClientRect() : null;
        const panelRectRaw = panel ? panel.getBoundingClientRect() : null;
        const outcomeRectRaw = outcomeCard ? outcomeCard.getBoundingClientRect() : null;
        const nudgeStyle = nudge ? getComputedStyle(nudge) : null;
        const nudgeBeforeStyle = nudge ? getComputedStyle(nudge, '::before') : null;
        const outcomeStyle = outcomeCard ? getComputedStyle(outcomeCard) : null;
        const overlaps = (a, b) => !!(a && b && a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1);
        const centerDeltaY = panelRectRaw && nudgeRectRaw
          ? Math.abs((nudgeRectRaw.top + nudgeRectRaw.bottom) / 2 - (panelRectRaw.top + panelRectRaw.bottom) / 2)
          : Infinity;
        return {
          winner: state.inlineGameOver && state.inlineGameOver.winner,
          active: state.inlineGameOver && state.inlineGameOver.active,
          playerGameWins: state.playerGameWins,
          inlinePlayerGameWins: state.inlineGameOver && state.inlineGameOver.playerGameWins,
          autoRestartMs: state.inlineGameOver && state.inlineGameOver.autoRestartMs,
          autoContinue: state.inlineGameOver && state.inlineGameOver.autoContinue,
          rollButtonText: (roll || {}).textContent || '',
          title: outcomeTitle ? outcomeTitle.textContent.replace(/\s+/g, ' ').trim() : '',
          sub: outcomeSub ? outcomeSub.textContent.replace(/\s+/g, ' ').trim() : '',
          chip: {
            visible: !!(chip && !chip.hidden && getComputedStyle(chip).display !== 'none'),
            text: chipText ? chipText.textContent.replace(/\s+/g, ' ').trim() : '',
            gameWins: chip ? Number(chip.dataset.gameWins || 0) : 0
          },
          terminalRewardNudge: {
            visible: !!(nudge && !nudge.hidden && getComputedStyle(nudge).display !== 'none' && nudgeRectRaw && nudgeRectRaw.width >= 120 && nudgeRectRaw.height >= 28),
            layout: nudge ? nudge.dataset.layout || '' : '',
            animationName: nudgeStyle ? nudgeStyle.animationName || '' : '',
            beforeAnimationName: nudgeBeforeStyle ? nudgeBeforeStyle.animationName || '' : '',
            overlapsRoll: overlaps(nudgeRectRaw, rollRectRaw),
            dockedToPlayerPanel: !!(nudgeRectRaw && panelRectRaw && nudgeRectRaw.left >= panelRectRaw.left - 36 && nudgeRectRaw.right <= panelRectRaw.right + 36 && centerDeltaY <= Math.max(24, panelRectRaw.height * 0.48)),
            rect: toRect(nudge),
            rollRect: toRect(roll),
            playerPanelRect: toRect(panel)
          },
          outcomeCard: {
            visible: !!(outcomeCard && outcomeStyle && outcomeStyle.visibility !== 'hidden' && parseFloat(outcomeStyle.opacity || '0') > 0.1 && outcomeRectRaw && outcomeRectRaw.width > 0 && outcomeRectRaw.height > 0),
            animationName: outcomeStyle ? outcomeStyle.animationName || '' : '',
            rect: toRect(outcomeCard)
          },
          outcomeVisible: getComputedStyle(document.getElementById('debugOutcomeControls')).display !== 'none'
        };
      })()`);
      assert(outcomeState.active === true, `${outcome.label} probe: wrap-up not active ${JSON.stringify(outcomeState)}`);
      assert(outcomeState.winner === outcome.winner, `${outcome.label} probe: wrong winner ${JSON.stringify(outcomeState)}`);
      assert(outcomeState.autoContinue === false && outcomeState.autoRestartMs >= 3000 && outcomeState.autoRestartMs <= 5000, `${outcome.label} probe: wrap-up should quietly auto-advance after a short result beat ${JSON.stringify(outcomeState)}`);
      assert(outcomeState.rollButtonText.includes('KEEP PLAYING!'), `${outcome.label} probe: keep-playing CTA missing ${JSON.stringify(outcomeState)}`);
      assert(outcomeState.terminalRewardNudge.visible === true && outcomeState.terminalRewardNudge.layout === 'player-panel-dock' && outcomeState.terminalRewardNudge.overlapsRoll === false && outcomeState.terminalRewardNudge.dockedToPlayerPanel === true, `${outcome.label} probe: terminal reward nudge should dock to the player pile panel without covering Keep Playing ${JSON.stringify(outcomeState)}`);
      assert(outcomeState.terminalRewardNudge.animationName.includes('terminalRewardDockedAttract') && outcomeState.terminalRewardNudge.beforeAnimationName.includes('terminalRewardAttractSweep'), `${outcome.label} probe: terminal reward nudge should be the animated attract-mode element ${JSON.stringify(outcomeState)}`);
      if (outcome.label === 'win') {
        assert(outcomeState.playerGameWins === 1 && outcomeState.inlinePlayerGameWins && outcomeState.inlinePlayerGameWins.after === 1 && outcomeState.chip.visible === true && outcomeState.chip.gameWins === 1 && /GAMES WON:\s*1/.test(outcomeState.chip.text), `${outcome.label} probe: player game-win should show a session games-won counter ${JSON.stringify(outcomeState)}`);
      }
      if (outcome.label === 'lose') {
        assert(outcomeState.title === 'KEEP TRYING!' && outcomeState.sub === 'CPU WINS' && outcomeState.chip.visible === false && outcomeState.playerGameWins === 0, `${outcome.label} probe: loss should invite retry without counting a game win ${JSON.stringify(outcomeState)}`);
        assert(outcomeState.outcomeCard.visible === true && outcomeState.outcomeCard.animationName === 'none' && outcomeState.outcomeCard.rect.width <= 660, `${outcome.label} probe: KEEP TRYING outcome panel should be static and smaller than the reward chase ${JSON.stringify(outcomeState)}`);
      }
      assert(outcomeState.outcomeVisible === true, `${outcome.label} probe: outcome buttons hidden after wrap-up ${JSON.stringify(outcomeState)}`);
      await waitEval(outcomeProbe, `(() => {
        const state = window.TrashDiceQA.state();
        return !state.inlineGameOver && state.gameStarted === true && state.totalRolls === 0 && !document.getElementById('rollBtn').disabled;
      })()`, `${outcome.label} probe quiet auto-advance`, 7000);
      const outcomeAutoAdvance = await evalValue(outcomeProbe, `(() => ({
        state: window.TrashDiceQA.state(),
        rollText: (document.getElementById('rollBtn') || {}).textContent || '',
        events: window.TrashDiceAnalyticsDebug.log.map(item => ({ eventName: item.eventName, method: item.payload && item.payload.method }))
      }))()`);
      assert(outcomeAutoAdvance.rollText.includes('ROLL') && !outcomeAutoAdvance.state.inlineGameOver && outcomeAutoAdvance.state.gameStarted === true, `${outcome.label} probe: quiet auto-advance did not leave the next game ready ${JSON.stringify(outcomeAutoAdvance)}`);
      assert(outcomeAutoAdvance.events.some(item => item.eventName === 'td_play_again' && item.method === 'auto_game_continue') && outcomeAutoAdvance.events.some(item => item.eventName === 'td_game_start' && item.method === 'auto_game_continue'), `${outcome.label} probe: quiet auto-advance analytics missing ${JSON.stringify(outcomeAutoAdvance.events)}`);
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
      version: EXPECTED_TRASH_DICE_VERSION,
      versionLabel: EXPECTED_TRASH_DICE_VERSION_LABEL,
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
