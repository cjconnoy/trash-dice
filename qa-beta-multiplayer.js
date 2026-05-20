const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const baseUrl = (process.argv[2] || 'http://127.0.0.1:5175').replace(/\/+$/, '');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debugPort = 11200 + Math.floor(Math.random() * 700);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'trash-dice-beta-'));
const mobileViewport = {
  width: 320,
  height: 460,
  deviceScaleFactor: 2,
  mobile: true,
  screenWidth: 320,
  screenHeight: 568
};
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
  const path = url.pathname.replace(/\/+$/, '');
  if (/\/beta(?:-[a-z0-9]+)?$/i.test(path) || /\.html$/i.test(path)) {
    return url.toString();
  }
  url.pathname = `${path}/beta/`.replace(/\/{2,}/g, '/');
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
  async function page(url) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const cdp = (method, params = {}) => send(method, params, sessionId);
    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Emulation.setDeviceMetricsOverride', mobileViewport);
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: true });
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
  async function waitEval(pageRef, expression, label, timeout = 9000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const value = await evalValue(pageRef, expression);
      if (value) return value;
      await sleep(100);
    }
    throw new Error(`timeout ${label}`);
  }
  async function waitForDisconnectRecovery(pageRef, label, timeout = 12000) {
    const expression = `(() => {
      const state = window.TrashDiceDebug.state();
      const overlay = document.getElementById('startOverlay');
      const panel = document.getElementById('betaRoomPanel');
      const status = document.getElementById('betaRoomStatus');
      const roll = document.getElementById('rollBtn');
      const gameArea = document.querySelector('.game-area');
      const trash = document.getElementById('trashCan');
      const overlayStyle = overlay ? getComputedStyle(overlay) : null;
      const gameStyle = gameArea ? getComputedStyle(gameArea) : null;
      const trashClasses = trash ? Array.from(trash.classList) : [];
      const hotTrashClasses = ['flash', 'pour', 'player-payout-can-dance', 'inline-ending-can-dance', 'victory-erupt'];
      const leftovers = document.querySelectorAll('.travelling-die, .can-pour-die, .lid-payout-die, .payout-comet-trail, .lid-place-burst, .claim-badge').length;
      let trashTopmost = false;
      if (trash) {
        const rect = trash.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + Math.min(rect.height * 0.18, rect.height / 2));
          trashTopmost = !!(top && (top === trash || trash.contains(top)));
        }
      }
      const report = {
        gameStarted: state.gameStarted,
        multiplayerActive: state.beta.multiplayerActive,
        seat: state.beta.seat,
        roomCode: state.beta.roomCode,
        bodyRecovery: document.body.classList.contains('beta-room-recovery'),
        overlayDisplay: overlayStyle ? overlayStyle.display : null,
        overlayOpacity: overlayStyle ? overlayStyle.opacity : null,
        overlayZ: overlayStyle ? Number(overlayStyle.zIndex) : null,
        overlayOpen: !!(overlay && overlay.classList.contains('beta-room-open') && !overlay.classList.contains('hide')),
        panelVisible: !!(panel && !panel.hidden && getComputedStyle(panel).display !== 'none'),
        statusText: status ? status.textContent : '',
        rollDisabled: roll ? roll.disabled : null,
        gameVisibility: gameStyle ? gameStyle.visibility : null,
        gameOpacity: gameStyle ? gameStyle.opacity : null,
        leftovers,
        trashClasses,
        trashTopmost
      };
      report.ok =
        report.bodyRecovery &&
        report.overlayDisplay !== 'none' &&
        report.overlayOpen &&
        report.overlayZ >= 10000 &&
        report.panelVisible &&
        /left|closed|lost/i.test(report.statusText) &&
        report.gameStarted === false &&
        report.multiplayerActive === false &&
        report.rollDisabled === true &&
        report.gameVisibility === 'hidden' &&
        Number(report.gameOpacity) === 0 &&
        report.leftovers === 0 &&
        !report.trashTopmost &&
        !hotTrashClasses.some(className => report.trashClasses.includes(className));
      return report;
    })()`;
    const startedAt = Date.now();
    let lastReport = null;
    while (Date.now() - startedAt < timeout) {
      lastReport = await evalValue(pageRef, expression);
      if (lastReport && lastReport.ok) return lastReport;
      await sleep(100);
    }
    throw new Error(`timeout ${label} ${JSON.stringify(lastReport)}`);
  }

  const gameUrl = betaPageUrl();
  const player1 = await page(gameUrl);
  await evalValue(player1, `Math.random = () => 0.08; true`);
  await evalValue(player1, `
    document.getElementById('betaTwoPlayerBtn').click();
    document.getElementById('betaCreateBtn').click();
    true
  `);
  const roomCode = await waitEval(player1, `document.getElementById('betaRoomCode').textContent.trim()`, 'room code');
  const inviteLayout = await waitEval(player1, `
    (() => {
      const overlay = document.getElementById('startOverlay');
      const panel = document.getElementById('betaRoomPanel');
      const qr = document.getElementById('betaQr');
      const share = document.getElementById('betaShareBtn');
      const copyLink = document.getElementById('betaCopyLinkBtn');
      const copyCode = document.getElementById('betaCopyCodeBtn');
      const link = document.getElementById('betaShareLink');
      if (!overlay || !panel || !qr || !share || !copyLink || !copyCode || !link) return null;
      const overlayStyle = getComputedStyle(overlay);
      const panelRect = panel.getBoundingClientRect();
      const shareRect = share.getBoundingClientRect();
      const copyLinkRect = copyLink.getBoundingClientRect();
      const copyCodeRect = copyCode.getBoundingClientRect();
      const href = window.TrashDiceDebug.state().beta.inviteHref;
      const scrollSafe = overlay.scrollHeight <= overlay.clientHeight + 2 || /(auto|scroll)/.test(overlayStyle.overflowY);
      const tapTargetsSafe = [shareRect, copyLinkRect, copyCodeRect].every(rect => rect.width >= 96 && rect.height >= 40);
      return scrollSafe &&
        panelRect.width <= window.innerWidth - 20 &&
        tapTargetsSafe &&
        !qr.hidden &&
        qr.getBoundingClientRect().width >= 140 &&
        !share.disabled &&
        !copyLink.disabled &&
        !copyCode.disabled &&
        link.textContent.includes('Join link') &&
        href && href.includes('room=${roomCode}');
    })()
  `, 'host invite controls safe');
  if (!inviteLayout) {
    throw new Error('host invite controls were not safe on small viewport');
  }
  await evalValue(player1, `document.getElementById('betaCopyCodeBtn').click(); true`);
  await waitEval(player1, `
    /Code copied|Copy failed/.test(document.getElementById('betaRoomStatus').textContent)
  `, 'copy code button responds');

  const player2 = await page(gameUrl);
  let player2ClosedForRecovery = false;
  await evalValue(player2, `Math.random = () => 0.92; true`);
  await evalValue(player2, `document.getElementById('betaTwoPlayerBtn').click(); true`);
  await waitEval(player2, `
    (() => {
      const input = document.getElementById('betaJoinCode');
      const label = document.getElementById('betaJoinLabel');
      if (!input || !label) return false;
      const rect = input.getBoundingClientRect();
      const styles = getComputedStyle(input);
      return styles.display !== 'none' &&
        rect.width > 120 &&
        rect.height >= 44 &&
        label.textContent.includes('Enter Code');
    })()
  `, 'player 2 code entry visible');
  await evalValue(player2, `document.getElementById('betaJoinBtn').click(); true`);
  await waitEval(player2, `
    document.activeElement &&
    document.activeElement.id === 'betaJoinCode' &&
    document.getElementById('betaRoomStatus').textContent.includes('4 digit code')
  `, 'player 2 empty join focuses code input');
  await evalValue(player2, `
    const input = document.getElementById('betaJoinCode');
    input.value = '${roomCode}';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    true
  `);
  await waitEval(player1, `
    (() => {
      const button = document.getElementById('betaStartRoomBtn');
      const status = document.getElementById('betaRoomStatus').textContent;
      return button &&
        !button.disabled &&
        button.textContent.includes('Roll For First') &&
        status.includes('Roll once to see who starts');
    })()
  `, 'player 1 ready to roll for first');
  await waitEval(player2, `
    document.getElementById('betaRoomStatus').textContent.includes('Waiting for Player 1') ||
    document.getElementById('betaRoomStatus').textContent.includes('Connected')
  `, 'player 2 ready');

  const firstRollStartedAt = Date.now();
  await evalValue(player1, `document.getElementById('betaStartRoomBtn').click(); true`);
  await waitEval(player1, `window.TrashDiceDebug.state().gameStarted && window.TrashDiceDebug.state().beta.multiplayerActive`, 'player 1 started');
  await waitEval(player2, `window.TrashDiceDebug.state().gameStarted && window.TrashDiceDebug.state().beta.multiplayerActive`, 'player 2 started');
  await waitEval(player1, `
    /ROLLING FOR FIRST|HIGH ROLL|ROLL-OFF/.test(document.getElementById('message').textContent)
  `, 'player 1 first roll purpose visible');
  await waitEval(player2, `
    /ROLLING FOR FIRST|HIGH ROLL|ROLL-OFF/.test(document.getElementById('message').textContent)
  `, 'player 2 first roll purpose visible');

  await waitEval(player1, `
    (() => {
      const state = window.TrashDiceDebug.state();
      return state.beta.firstRoll &&
        !state.beta.firstRoll.active &&
        !state.beta.firstRoll.settling &&
        !!state.beta.firstRoll.winner &&
        state.current === state.beta.firstRoll.winner;
    })()
  `, 'player 1 first roll resolved', 20000);
  await waitEval(player2, `
    (() => {
      const state = window.TrashDiceDebug.state();
      return state.beta.firstRoll &&
        !state.beta.firstRoll.active &&
        !state.beta.firstRoll.settling &&
        !!state.beta.firstRoll.winner &&
        state.current === state.beta.firstRoll.winner;
    })()
  `, 'player 2 first roll resolved', 20000);
  const firstRoll = await evalValue(player1, `window.TrashDiceDebug.state().beta.firstRoll`);
  const firstRollMs = Date.now() - firstRollStartedAt;
  const maxFirstRollMs = 3500;
  if (firstRollMs > maxFirstRollMs) {
    throw new Error(`opening roll-off took ${firstRollMs}ms, expected <= ${maxFirstRollMs}ms`);
  }
  if (!firstRoll.values || !firstRoll.values.p1 || !firstRoll.values.p2 || firstRoll.values.p1 === firstRoll.values.p2) {
    throw new Error(`opening first roll did not resolve cleanly ${JSON.stringify(firstRoll)}`);
  }
  const expectedStarter = firstRoll.values.p1 > firstRoll.values.p2 ? 'p1' : 'p2';
  if (firstRoll.winner !== expectedStarter) {
    throw new Error(`opening first roll picked ${firstRoll.winner}, expected ${expectedStarter}: ${JSON.stringify(firstRoll)}`);
  }

  async function waitForRollReady(pageRef, player, label) {
    await waitEval(pageRef, `
      (() => {
        const state = window.TrashDiceDebug.state();
        return state.current === '${player}' &&
          !state.busy &&
          !state.beta.firstRoll.active &&
          !state.beta.firstRoll.settling &&
          !document.getElementById('rollBtn').disabled;
      })()
    `, label, 12000);
  }
  async function readPlayer2RollLayout() {
    return evalValue(player2, `
    (() => {
      const roll = document.querySelector('.roll-panel');
      const badge = document.querySelector('.milestone-badge');
      if (!roll) return null;
      const r = roll.getBoundingClientRect();
      const b = badge ? badge.getBoundingClientRect() : null;
      return {
        viewportHeight: window.innerHeight,
        rollTop: r.top,
        rollBottom: r.bottom,
        rollHeight: r.height,
        bottomClearance: window.innerHeight - r.bottom,
        badgeOverlapsRoll: !!(b && b.right > r.left && b.left < r.right && b.bottom > r.top && b.top < r.bottom)
      };
    })()
  `);
  }

  async function readPlayer1TurnSnapshot() {
    return evalValue(player1, `
      (() => {
        const state = window.TrashDiceDebug.state();
        const rollBtn = document.getElementById('rollBtn');
        return {
          current: state.current,
          busy: state.busy,
          rollDisabled: rollBtn.disabled,
          totalRolls: state.totalRolls,
          message: document.getElementById('message').textContent.trim()
        };
      })()
    `);
  }

  async function observeP2ToP1Handoff() {
    const startedAt = Date.now();
    const maxTotalMs = 9000;
    const maxHandoffMs = 850;
    let completedAt = null;
    let completionMessage = '';
    const events = [];
    let lastSnapshot = '';

    while (Date.now() - startedAt < maxTotalMs) {
      const state = await readPlayer1TurnSnapshot();
      const now = Date.now();
      const snapshot = `${state.current}|${state.busy}|${state.rollDisabled}|${state.totalRolls}|${state.message}`;
      if (snapshot !== lastSnapshot) {
        lastSnapshot = snapshot;
        events.push({ ...state, t: now - startedAt });
      }
      if (!completedAt && state.current === 'p2' && state.busy && /^(LID|TRASH)\b/.test(state.message)) {
        completedAt = now;
        completionMessage = state.message;
      }
      if (completedAt && state.current === 'p1' && !state.busy && !state.rollDisabled) {
        const report = {
          completionMessage,
          totalMs: now - startedAt,
          handoffMs: now - completedAt,
          events: events.slice(-16),
          maxHandoffMs
        };
        if (report.handoffMs > maxHandoffMs) {
          throw new Error(`p2-to-p1 handoff exceeded ${maxHandoffMs}ms ${JSON.stringify(report)}`);
        }
        return report;
      }
      await sleep(35);
    }

    throw new Error(`timeout p2-to-p1 handoff ${JSON.stringify({
      completionMessage,
      handoffMs: completedAt ? Date.now() - completedAt : null,
      events: events.slice(-16),
      maxHandoffMs
    })}`);
  }

  let player2RollLayout;
  let p2ToP1Handoff;
  if (firstRoll.winner === 'p2') {
    await waitForRollReady(player2, 'p2', 'green starter ready');
    player2RollLayout = await readPlayer2RollLayout();
    const p2ToP1Probe = observeP2ToP1Handoff();
    await evalValue(player2, `document.getElementById('rollBtn').click(); true`);
    await send('Target.activateTarget', { targetId: player1.targetId });
    p2ToP1Handoff = await p2ToP1Probe;
    await waitEval(player1, `window.TrashDiceDebug.state().totalRolls === 1 && window.TrashDiceDebug.state().current === 'p1'`, 'player 1 sees yellow turn');
    await waitEval(player2, `window.TrashDiceDebug.state().totalRolls === 1 && window.TrashDiceDebug.state().current === 'p1'`, 'player 2 sees yellow turn');
    await waitForRollReady(player1, 'p1', 'yellow second ready');
    await evalValue(player1, `document.getElementById('rollBtn').click(); true`);
  } else {
    await waitForRollReady(player1, 'p1', 'yellow starter ready');
    await evalValue(player1, `document.getElementById('rollBtn').click(); true`);
    await waitEval(player1, `window.TrashDiceDebug.state().totalRolls === 1 && window.TrashDiceDebug.state().current === 'p2'`, 'player 1 sees green turn');
    await waitEval(player2, `window.TrashDiceDebug.state().totalRolls === 1 && window.TrashDiceDebug.state().current === 'p2'`, 'player 2 sees green turn');
    await waitForRollReady(player2, 'p2', 'green second ready');
    player2RollLayout = await readPlayer2RollLayout();
    const p2ToP1Probe = observeP2ToP1Handoff();
    await evalValue(player2, `document.getElementById('rollBtn').click(); true`);
    await send('Target.activateTarget', { targetId: player1.targetId });
    p2ToP1Handoff = await p2ToP1Probe;
    await waitEval(player1, `window.TrashDiceDebug.state().totalRolls === 2 && window.TrashDiceDebug.state().current === 'p1'`, 'player 1 sees yellow return');
    await waitEval(player2, `window.TrashDiceDebug.state().totalRolls === 2 && window.TrashDiceDebug.state().current === 'p1'`, 'player 2 sees yellow return');
  }
  if (!player2RollLayout || player2RollLayout.bottomClearance < 64 || player2RollLayout.badgeOverlapsRoll) {
    throw new Error(`player 2 SE roll layout unsafe ${JSON.stringify(player2RollLayout)}`);
  }

  await waitEval(player1, `window.TrashDiceDebug.state().totalRolls === 2`, 'player 1 sees second roll');
  await waitEval(player2, `window.TrashDiceDebug.state().totalRolls === 2`, 'player 2 sees second roll');

  await send('Target.closeTarget', { targetId: player2.targetId });
  player2ClosedForRecovery = true;
  const hostDisconnectRecovery = await waitForDisconnectRecovery(player1, 'host recovery after player 2 disconnect');

  const out = {
    ok: true,
    roomCode,
    firstRoll,
    firstRollMs,
    maxFirstRollMs,
    player2RollLayout,
    p2ToP1Handoff,
    hostDisconnectRecovery,
    player1: await evalValue(player1, `window.TrashDiceDebug.state().beta`),
    player2ClosedForRecovery
  };
  console.log(JSON.stringify(out, null, 2));
  await send('Target.closeTarget', { targetId: player1.targetId });
  if (!player2ClosedForRecovery) {
    await send('Target.closeTarget', { targetId: player2.targetId });
  }
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
