const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(process.argv[2] || process.cwd());
const port = Number(process.argv[3] || 5175);
const rooms = new Map();
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const lockedBuilds = {
  dc5a995: {
    '/': 'releases/alpha-complete/index.html',
    '/index.html': 'releases/alpha-complete/index.html',
    '/trash-dice.html': 'releases/alpha-complete/trash-dice.html'
  }
};
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function isInsideRoot(target) {
  return target === root || target.startsWith(root + path.sep);
}

function resolveTarget(url, pathname) {
  if (pathname === '/beta' || pathname === '/beta/' || pathname === '/beta/index.html') {
    return path.resolve(root, 'beta/index.html');
  }
  if (pathname === '/beta/trash-dice.html') {
    return path.resolve(root, 'beta/trash-dice.html');
  }
  if (pathname === '/alpha-complete' || pathname === '/alpha-complete/' || pathname === '/alpha-complete/index.html') {
    return path.resolve(root, 'releases/alpha-complete/index.html');
  }
  if (pathname === '/alpha-complete/trash-dice.html') {
    return path.resolve(root, 'releases/alpha-complete/trash-dice.html');
  }
  const lockedBuild = lockedBuilds[url.searchParams.get('v')];
  const lockedPath = lockedBuild && lockedBuild[pathname];
  if (lockedPath) return path.resolve(root, lockedPath);
  return path.resolve(root, pathname.replace(/^\/+/, ''));
}

function makeRoomCode() {
  cleanupRooms();
  for (let i = 0; i < 40; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    if (!rooms.has(code)) return code;
  }
  return String(Date.now()).slice(-4);
}

function cleanRoomCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 4);
}

function cleanupRooms(now = Date.now()) {
  for (const [code, room] of rooms) {
    const occupied = !!(room.clients && (room.clients.p1 || room.clients.p2));
    if (!occupied || now - room.createdAt > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  }
}

function otherSeat(seat) {
  return seat === 'p1' ? 'p2' : 'p1';
}

function resetGameplayState(room, starter = 'p1') {
  room.board = Array(6).fill(null);
  room.dice = { p1: 20, p2: 20 };
  room.expectedSeat = starter === 'p2' ? 'p2' : 'p1';
  room.gameOver = false;
  room.rollCount = 0;
}

function applyGameplayRoll(room, seat, value) {
  if (!room.board || !room.dice || !room.expectedSeat) resetGameplayState(room, room.expectedSeat || seat);
  if (room.gameOver) return { ok: false, message: 'Game already ended' };
  if (seat !== room.expectedSeat) return { ok: false, message: 'Not your turn' };
  if (room.dice[seat] <= 0) return { ok: false, message: 'No dice left' };

  room.dice[seat] -= 1;
  room.rollCount += 1;

  const index = value - 1;
  if (!room.board[index]) {
    room.board[index] = { seat, value };
    const lidCount = room.board.filter(Boolean).length;
    if (lidCount === 6) {
      room.dice[seat] += lidCount;
      room.board = Array(6).fill(null);
      room.expectedSeat = 'p1';
      return { ok: true };
    }
  }

  if (room.dice[seat] <= 0) {
    room.gameOver = true;
    room.expectedSeat = null;
    return { ok: true };
  }

  room.expectedSeat = otherSeat(seat);
  return { ok: true };
}

function roomSnapshot(room) {
  return {
    type: 'room-state',
    roomCode: room.code,
    seats: {
      p1: !!room.clients.p1,
      p2: !!room.clients.p2
    },
    started: room.started
  };
}

function firstRollSnapshot(room) {
  const firstRoll = room.firstRoll || { round: 0, values: {} };
  return {
    type: 'first-roll-state',
    roomCode: room.code,
    round: firstRoll.round || 0,
    values: {
      p1: firstRoll.values && firstRoll.values.p1 || null,
      p2: firstRoll.values && firstRoll.values.p2 || null
    }
  };
}

function beginFirstRoll(room) {
  room.started = false;
  room.firstRoll = {
    active: true,
    round: 1,
    values: {},
    winner: null
  };
}

function encodeWs(payload) {
  const body = Buffer.from(JSON.stringify(payload));
  if (body.length < 126) {
    return Buffer.concat([Buffer.from([0x81, body.length]), body]);
  }
  if (body.length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(body.length, 2);
    return Buffer.concat([header, body]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(body.length), 2);
  return Buffer.concat([header, body]);
}

function sendWs(client, payload) {
  if (!client || client.socket.destroyed) return;
  client.socket.write(encodeWs(payload));
}

function broadcast(room, payload) {
  Object.values(room.clients).forEach(client => sendWs(client, payload));
}

function detachClient(client) {
  if (!client.room || !client.seat) return;
  const room = client.room;
  const leavingSeat = client.seat;
  if (room.clients[client.seat] === client) {
    delete room.clients[client.seat];
  }
  client.room = null;
  client.seat = null;
  if (leavingSeat === 'p1') {
    broadcast(room, { type: 'room-closed', roomCode: room.code, message: 'Player 1 left' });
    Object.values(room.clients).forEach(remaining => {
      remaining.room = null;
      remaining.seat = null;
    });
    rooms.delete(room.code);
    return;
  }
  if (!room.clients.p1 && !room.clients.p2) {
    rooms.delete(room.code);
    return;
  }
  room.started = false;
  room.firstRoll = null;
  room.expectedSeat = null;
  room.gameOver = false;
  broadcast(room, { type: 'peer-left', roomCode: room.code, seat: leavingSeat });
  broadcast(room, roomSnapshot(room));
}

function attachClient(client, room, seat) {
  detachClient(client);
  client.room = room;
  client.seat = seat;
  room.clients[seat] = client;
}

function handleWsMessage(client, payload) {
  let message;
  try {
    message = JSON.parse(payload);
  } catch (_) {
    sendWs(client, { type: 'error', message: 'Bad message' });
    return;
  }

  if (message.type === 'create') {
    const code = makeRoomCode();
    const room = {
      code,
      createdAt: Date.now(),
      started: false,
      firstRoll: null,
      board: Array(6).fill(null),
      dice: { p1: 20, p2: 20 },
      expectedSeat: null,
      gameOver: false,
      rollCount: 0,
      clients: {}
    };
    rooms.set(code, room);
    attachClient(client, room, 'p1');
    sendWs(client, { type: 'room-created', roomCode: code, seat: 'p1' });
    broadcast(room, roomSnapshot(room));
    return;
  }

  if (message.type === 'join') {
    cleanupRooms();
    const code = cleanRoomCode(message.roomCode);
    const room = rooms.get(code);
    if (!room) {
      sendWs(client, { type: 'error', message: 'Room not found' });
      return;
    }
    if (room.clients.p2) {
      sendWs(client, { type: 'error', message: 'Room is full' });
      return;
    }
    attachClient(client, room, 'p2');
    sendWs(client, { type: 'room-joined', roomCode: code, seat: 'p2' });
    broadcast(room, roomSnapshot(room));
    return;
  }

  if (!client.room || !client.seat) {
    sendWs(client, { type: 'error', message: 'Join or create a room first' });
    return;
  }

  if (message.type === 'start') {
    const room = client.room;
    if (client.seat !== 'p1') {
      sendWs(client, { type: 'error', message: 'Only Player 1 can start' });
      return;
    }
    if (!room.clients.p1 || !room.clients.p2) {
      sendWs(client, { type: 'error', message: 'Waiting for Player 2' });
      return;
    }
    if ((room.firstRoll && room.firstRoll.active) || room.started) {
      sendWs(client, roomSnapshot(room));
      if (room.firstRoll && room.firstRoll.active) sendWs(client, firstRollSnapshot(room));
      return;
    }
    beginFirstRoll(room);
    broadcast(room, { type: 'start', roomCode: room.code, firstRollRound: room.firstRoll.round });
    broadcast(room, firstRollSnapshot(room));
    broadcast(room, roomSnapshot(room));
    return;
  }

  if (message.type === 'first-roll') {
    const room = client.room;
    const firstRoll = room.firstRoll;
    const value = Math.max(1, Math.min(6, Math.floor(Number(message.value) || 0)));
    const round = Math.floor(Number(message.round) || 0);
    if (!firstRoll || !firstRoll.active || room.started || firstRoll.round !== round || value < 1 || value > 6) {
      sendWs(client, { type: 'error', message: 'Opening roll rejected' });
      return;
    }
    if (firstRoll.values[client.seat]) {
      sendWs(client, firstRollSnapshot(room));
      return;
    }
    firstRoll.values[client.seat] = value;
    broadcast(room, firstRollSnapshot(room));
    if (!firstRoll.values.p1 || !firstRoll.values.p2) return;

    const values = { p1: firstRoll.values.p1, p2: firstRoll.values.p2 };
    if (values.p1 === values.p2) {
      firstRoll.round += 1;
      firstRoll.values = {};
      broadcast(room, {
        type: 'first-roll-tie',
        roomCode: room.code,
        round,
        nextRound: firstRoll.round,
        values
      });
      return;
    }

    const winner = values.p1 > values.p2 ? 'p1' : 'p2';
    firstRoll.active = false;
    firstRoll.winner = winner;
    room.started = true;
    resetGameplayState(room, winner);
    broadcast(room, {
      type: 'first-roll-result',
      roomCode: room.code,
      round,
      values,
      winner
    });
    broadcast(room, roomSnapshot(room));
    return;
  }

  if (message.type === 'roll') {
    const value = Math.max(1, Math.min(6, Math.floor(Number(message.value) || 0)));
    if (!client.room.started || value < 1 || value > 6) {
      sendWs(client, { type: 'error', message: 'Roll rejected' });
      return;
    }
    const rollResult = applyGameplayRoll(client.room, client.seat, value);
    if (!rollResult.ok) {
      sendWs(client, { type: 'error', message: rollResult.message || 'Roll rejected' });
      return;
    }
    broadcast(client.room, {
      type: 'roll',
      roomCode: client.room.code,
      seat: client.seat,
      value,
      rollId: crypto.randomBytes(6).toString('hex')
    });
    return;
  }

  if (message.type === 'leave') {
    detachClient(client);
    sendWs(client, { type: 'left' });
  }
}

function readWsFrames(client, chunk) {
  client.buffer = client.buffer ? Buffer.concat([client.buffer, chunk]) : chunk;
  while (client.buffer.length >= 2) {
    const first = client.buffer[0];
    const second = client.buffer[1];
    const opcode = first & 0x0f;
    const masked = !!(second & 0x80);
    let length = second & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (client.buffer.length < offset + 2) return;
      length = client.buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      if (client.buffer.length < offset + 8) return;
      length = Number(client.buffer.readBigUInt64BE(offset));
      offset += 8;
    }
    if (!masked) {
      client.socket.destroy();
      return;
    }
    if (client.buffer.length < offset + 4 + length) return;
    const mask = client.buffer.subarray(offset, offset + 4);
    offset += 4;
    const body = Buffer.alloc(length);
    for (let i = 0; i < length; i++) {
      body[i] = client.buffer[offset + i] ^ mask[i % 4];
    }
    client.buffer = client.buffer.subarray(offset + length);

    if (opcode === 0x8) {
      client.socket.end();
      return;
    }
    if (opcode === 0x1) {
      handleWsMessage(client, body.toString('utf8'));
    }
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  const target = resolveTarget(url, pathname);
  if (!isInsideRoot(target)) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('forbidden');
    return;
  }
  fs.readFile(target, (error, buffer) => {
    if (error) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'content-type': types[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(buffer);
  });
});

server.on('upgrade', (req, socket) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname !== '/beta-ws') {
    socket.destroy();
    return;
  }
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }
  const accept = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '',
    ''
  ].join('\r\n'));
  const client = {
    id: crypto.randomBytes(8).toString('hex'),
    socket,
    buffer: Buffer.alloc(0),
    room: null,
    seat: null
  };
  socket.on('data', chunk => readWsFrames(client, chunk));
  socket.on('close', () => detachClient(client));
  socket.on('error', () => detachClient(client));
  sendWs(client, { type: 'hello', clientId: client.id });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`serving ${root} on ${port}`);
});
