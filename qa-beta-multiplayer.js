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

  const player1 = await page(`${baseUrl}/beta/`);
  await evalValue(player1, `
    document.getElementById('betaTwoPlayerBtn').click();
    document.getElementById('betaCreateBtn').click();
    true
  `);
  const roomCode = await waitEval(player1, `document.getElementById('betaRoomCode').textContent.trim()`, 'room code');

  const player2 = await page(`${baseUrl}/beta/`);
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
  await waitEval(player1, `!document.getElementById('betaStartRoomBtn').disabled`, 'player 1 ready');
  await waitEval(player2, `
    document.getElementById('betaRoomStatus').textContent.includes('Waiting for Player 1') ||
    document.getElementById('betaRoomStatus').textContent.includes('Connected')
  `, 'player 2 ready');

  await evalValue(player1, `document.getElementById('betaStartRoomBtn').click(); true`);
  await waitEval(player1, `window.TrashDiceDebug.state().gameStarted && window.TrashDiceDebug.state().beta.multiplayerActive`, 'player 1 started');
  await waitEval(player2, `window.TrashDiceDebug.state().gameStarted && window.TrashDiceDebug.state().beta.multiplayerActive`, 'player 2 started');

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

  let player2RollLayout;
  if (firstRoll.winner === 'p2') {
    await waitForRollReady(player2, 'p2', 'green starter ready');
    player2RollLayout = await readPlayer2RollLayout();
    await evalValue(player2, `document.getElementById('rollBtn').click(); true`);
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
    await evalValue(player2, `document.getElementById('rollBtn').click(); true`);
  }
  if (!player2RollLayout || player2RollLayout.bottomClearance < 64 || player2RollLayout.badgeOverlapsRoll) {
    throw new Error(`player 2 SE roll layout unsafe ${JSON.stringify(player2RollLayout)}`);
  }

  await waitEval(player1, `window.TrashDiceDebug.state().totalRolls === 2`, 'player 1 sees second roll');
  await waitEval(player2, `window.TrashDiceDebug.state().totalRolls === 2`, 'player 2 sees second roll');

  const out = {
    ok: true,
    roomCode,
    firstRoll,
    player2RollLayout,
    player1: await evalValue(player1, `window.TrashDiceDebug.state().beta`),
    player2: await evalValue(player2, `window.TrashDiceDebug.state().beta`)
  };
  console.log(JSON.stringify(out, null, 2));
  await send('Target.closeTarget', { targetId: player1.targetId });
  await send('Target.closeTarget', { targetId: player2.targetId });
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
