const PUBLIC_BETA_WS_URL = 'wss://trash-dice-beta-room.play-onedaygames.workers.dev/beta-ws';
const target = process.argv[2] || 'http://127.0.0.1:5175';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function wsEndpoint(value) {
  if (/^wss?:\/\//i.test(value)) return value;
  const url = new URL(value);
  const publicHost = /(^|\.)playonedaygames\.com$/i.test(url.hostname) ||
    /(^|\.)playonedaygames\.pages\.dev$/i.test(url.hostname) ||
    url.hostname === 'onedaygames.github.io';
  if (publicHost) return PUBLIC_BETA_WS_URL;
  return `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/beta-ws`;
}

async function openClient(name, endpoint) {
  const ws = new WebSocket(endpoint);
  const client = { name, ws, messages: [] };
  ws.addEventListener('message', event => {
    try {
      client.messages.push(JSON.parse(event.data));
    } catch (_) {}
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${name} timed out opening`)), 10000);
    ws.addEventListener('open', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  await waitFor(client, message => message.type === 'hello', 'hello');
  return client;
}

function send(client, payload) {
  client.ws.send(JSON.stringify(payload));
}

async function waitFor(client, predicate, label, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = client.messages.find(predicate);
    if (found) return found;
    await sleep(50);
  }
  throw new Error(`${client.name} timeout waiting for ${label}: ${JSON.stringify(client.messages)}`);
}

async function main() {
  const endpoint = wsEndpoint(target);
  const p1 = await openClient('p1', endpoint);
  const p2 = await openClient('p2', endpoint);

  send(p1, { type: 'create' });
  const created = await waitFor(p1, message => message.type === 'room-created', 'room-created');

  send(p2, { type: 'join', roomCode: created.roomCode });
  await waitFor(p2, message => message.type === 'room-joined', 'room-joined');
  await waitFor(p1, message => message.type === 'room-state' && message.seats && message.seats.p2, 'player 2 visible');

  send(p2, { type: 'start' });
  await waitFor(p2, message => message.type === 'error' && /Only Player 1/.test(message.message), 'guest start rejected');

  send(p1, { type: 'start' });
  await waitFor(p1, message => message.type === 'start', 'host start');
  send(p1, { type: 'start' });
  await sleep(150);

  send(p1, { type: 'first-roll', round: 1, value: 5 });
  send(p2, { type: 'first-roll', round: 1, value: 2 });
  await waitFor(p1, message => message.type === 'first-roll-result' && message.winner === 'p1', 'first roll result');

  send(p2, { type: 'roll', value: 3 });
  const wrongTurn = await waitFor(p2, message => message.type === 'error' && /turn/i.test(message.message), 'wrong turn rejected');

  send(p1, { type: 'roll', value: 3 });
  const firstRoll = await waitFor(p2, message => message.type === 'roll' && message.seat === 'p1' && message.value === 3, 'p1 gameplay roll');

  send(p1, { type: 'roll', value: 4 });
  const duplicateTurn = await waitFor(p1, message => message.type === 'error' && /turn/i.test(message.message), 'duplicate turn rejected');

  send(p2, { type: 'roll', value: 4 });
  const secondRoll = await waitFor(p1, message => message.type === 'roll' && message.seat === 'p2' && message.value === 4, 'p2 gameplay roll');

  p1.ws.close();
  p2.ws.close();
  console.log(JSON.stringify({
    ok: true,
    endpoint,
    roomCode: created.roomCode,
    wrongTurn,
    duplicateTurn,
    firstRoll,
    secondRoll
  }, null, 2));
}

main().catch(error => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
});
