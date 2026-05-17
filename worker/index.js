const ROOM_HUB_NAME = 'trash-dice-beta-v2';

function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {})
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return json({ ok: true, service: 'trash-dice-beta-room' });
    }

    if (url.pathname === '/beta-ws') {
      const id = env.ROOMS.idFromName(ROOM_HUB_NAME);
      return env.ROOMS.get(id).fetch(request);
    }

    return json({
      ok: true,
      service: 'trash-dice-beta-room',
      websocket: '/beta-ws'
    });
  }
};

export class TrashDiceBetaRoomHub {
  constructor() {
    this.rooms = new Map();
    this.sessions = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return json({ ok: true, rooms: this.rooms.size, sessions: this.sessions.size });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return json({ ok: false, error: 'Expected WebSocket upgrade' }, { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.acceptSession(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  acceptSession(socket) {
    const session = {
      id: crypto.randomUUID(),
      socket,
      room: null,
      seat: null
    };
    this.sessions.set(socket, session);
    socket.accept();
    socket.addEventListener('message', event => this.handleMessage(session, event.data));
    socket.addEventListener('close', () => this.detachSession(session));
    socket.addEventListener('error', () => this.detachSession(session));
    this.send(session, { type: 'hello', clientId: session.id });
  }

  send(session, payload) {
    if (!session || session.socket.readyState !== WebSocket.OPEN) return;
    session.socket.send(JSON.stringify(payload));
  }

  broadcast(room, payload) {
    Object.values(room.clients).forEach(session => this.send(session, payload));
  }

  makeRoomCode() {
    for (let i = 0; i < 40; i++) {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      if (!this.rooms.has(code)) return code;
    }
    return String(Date.now()).slice(-4);
  }

  cleanRoomCode(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 4);
  }

  otherSeat(seat) {
    return seat === 'p1' ? 'p2' : 'p1';
  }

  resetGameplayState(room, starter = 'p1') {
    room.board = Array(6).fill(null);
    room.dice = { p1: 20, p2: 20 };
    room.expectedSeat = starter === 'p2' ? 'p2' : 'p1';
    room.gameOver = false;
    room.rollCount = 0;
  }

  applyGameplayRoll(room, seat, value) {
    if (!room.board || !room.dice || !room.expectedSeat) {
      this.resetGameplayState(room, room.expectedSeat || seat);
    }
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

    room.expectedSeat = this.otherSeat(seat);
    return { ok: true };
  }

  roomSnapshot(room) {
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

  firstRollSnapshot(room) {
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

  beginFirstRoll(room) {
    room.started = false;
    room.firstRoll = {
      active: true,
      round: 1,
      values: {},
      winner: null
    };
  }

  createRoom(session) {
    const code = this.makeRoomCode();
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
    this.rooms.set(code, room);
    this.attachSession(session, room, 'p1');
    this.send(session, { type: 'room-created', roomCode: code, seat: 'p1' });
    this.broadcast(room, this.roomSnapshot(room));
  }

  joinRoom(session, roomCode) {
    const code = this.cleanRoomCode(roomCode);
    const room = this.rooms.get(code);
    if (!room) {
      this.send(session, { type: 'error', message: 'Room not found' });
      return;
    }
    if (room.clients.p2) {
      this.send(session, { type: 'error', message: 'Room is full' });
      return;
    }
    this.attachSession(session, room, 'p2');
    this.send(session, { type: 'room-joined', roomCode: code, seat: 'p2' });
    this.broadcast(room, this.roomSnapshot(room));
  }

  attachSession(session, room, seat) {
    this.detachSession(session);
    session.room = room;
    session.seat = seat;
    room.clients[seat] = session;
  }

  detachSession(session) {
    if (!session || !session.room || !session.seat) return;
    const room = session.room;
    if (room.clients[session.seat] === session) delete room.clients[session.seat];
    session.room = null;
    session.seat = null;

    if (!room.clients.p1 && !room.clients.p2) {
      this.rooms.delete(room.code);
      return;
    }

    room.started = false;
    room.firstRoll = null;
    room.expectedSeat = null;
    this.broadcast(room, this.roomSnapshot(room));
  }

  handleMessage(session, data) {
    let message;
    try {
      message = JSON.parse(String(data || ''));
    } catch (_) {
      this.send(session, { type: 'error', message: 'Bad message' });
      return;
    }

    if (message.type === 'create') {
      this.createRoom(session);
      return;
    }

    if (message.type === 'join') {
      this.joinRoom(session, message.roomCode);
      return;
    }

    if (!session.room || !session.seat) {
      this.send(session, { type: 'error', message: 'Join or create a room first' });
      return;
    }

    if (message.type === 'start') {
      const room = session.room;
      if (session.seat !== 'p1') {
        this.send(session, { type: 'error', message: 'Only Player 1 can start' });
        return;
      }
      if (!room.clients.p1 || !room.clients.p2) {
        this.send(session, { type: 'error', message: 'Waiting for Player 2' });
        return;
      }
      this.beginFirstRoll(room);
      this.broadcast(room, { type: 'start', roomCode: room.code, firstRollRound: room.firstRoll.round });
      this.broadcast(room, this.firstRollSnapshot(room));
      this.broadcast(room, this.roomSnapshot(room));
      return;
    }

    if (message.type === 'first-roll') {
      const room = session.room;
      const firstRoll = room.firstRoll;
      const value = Math.max(1, Math.min(6, Math.floor(Number(message.value) || 0)));
      const round = Math.floor(Number(message.round) || 0);
      if (!firstRoll || !firstRoll.active || room.started || firstRoll.round !== round || value < 1 || value > 6) {
        this.send(session, { type: 'error', message: 'Opening roll rejected' });
        return;
      }
      if (firstRoll.values[session.seat]) {
        this.send(session, this.firstRollSnapshot(room));
        return;
      }

      firstRoll.values[session.seat] = value;
      this.broadcast(room, this.firstRollSnapshot(room));
      if (!firstRoll.values.p1 || !firstRoll.values.p2) return;

      const values = { p1: firstRoll.values.p1, p2: firstRoll.values.p2 };
      if (values.p1 === values.p2) {
        firstRoll.round += 1;
        firstRoll.values = {};
        this.broadcast(room, {
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
      this.resetGameplayState(room, winner);
      this.broadcast(room, {
        type: 'first-roll-result',
        roomCode: room.code,
        round,
        values,
        winner
      });
      this.broadcast(room, this.roomSnapshot(room));
      return;
    }

    if (message.type === 'roll') {
      const room = session.room;
      const value = Math.max(1, Math.min(6, Math.floor(Number(message.value) || 0)));
      if (!room.started || value < 1 || value > 6) {
        this.send(session, { type: 'error', message: 'Roll rejected' });
        return;
      }

      const rollResult = this.applyGameplayRoll(room, session.seat, value);
      if (!rollResult.ok) {
        this.send(session, { type: 'error', message: rollResult.message || 'Roll rejected' });
        return;
      }

      this.broadcast(room, {
        type: 'roll',
        roomCode: room.code,
        seat: session.seat,
        value,
        rollId: crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      });
      return;
    }

    if (message.type === 'leave') {
      this.detachSession(session);
      this.send(session, { type: 'left' });
    }
  }
}
