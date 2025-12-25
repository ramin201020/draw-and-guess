import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_, res) => res.json({ ok: true }));

// HTTP endpoint to create a room using an existing Socket.IO connection
app.post('/rooms', (req, res) => {
  const { socketId, name, settings, avatar } = req.body || {};
  const hostSocket = io.sockets.sockets.get(socketId);

  if (!hostSocket) {
    return res.status(400).json({ ok: false, error: 'SOCKET_NOT_FOUND' });
  }

  const room = createRoom(hostSocket, { settings });
  hostSocket.join(room.id);

  const player = {
    id: hostSocket.id,
    name: (name || 'Host').slice(0, 24),
    score: 0,
    debt: 0,
    isHost: true,
    isDrawer: false,
    avatar: avatar || null,
  };

  room.players.set(hostSocket.id, player);
  const state = roomSnapshot(room);
  io.to(room.id).emit('room:state', state);
  return res.json({ ok: true, roomId: room.id, state });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// In-memory state
const rooms = new Map();

function defaultSettings() {
  return { maxPoints: 300, roundTimeSec: 90, wordsPerRound: 3, maxPlayers: 12 };
}

function createRoom(hostSocket, payload) {
  const roomId = payload?.roomId || Math.random().toString(36).slice(2, 8);
  const settings = { ...defaultSettings(), ...(payload?.settings || {}) };
  const room = {
    id: roomId,
    hostId: hostSocket.id,
    settings,
    players: new Map(),
    status: 'LOBBY',
    currentRound: null,
    chat: []
  };
  rooms.set(roomId, room);
  return room;
}

function roomSnapshot(room) {
  return {
    id: room.id,
    hostId: room.hostId,
    settings: room.settings,
    status: room.status,
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, score: p.score, debt: p.debt, isHost: p.isHost, isDrawer: p.isDrawer, avatar: p.avatar })),
    currentRound: room.currentRound ? {
      number: room.currentRound.number,
      drawerId: room.currentRound.drawerId,
      endsAt: room.currentRound.endsAt,
      mask: room.currentRound.word ? room.currentRound.word.replace(/\S/g, '_') : null,
      guessed: room.currentRound.correctOrder.map(p => p.playerId)
    } : null
  };
}

function scoreSequence(M) {
  const scores = [];
  const P1 = Math.floor(M);
  scores.push(P1);
  const P2 = Math.floor(M / 2) + 60; scores.push(P2);
  const P3 = Math.floor(P2 / 2) + 30; scores.push(P3);
  const P4 = Math.floor(0.75 * P3); scores.push(P4);
  while (scores[scores.length - 1] > 0) {
    const prev = scores[scores.length - 1];
    const next = Math.floor(prev / 2);
    if (next <= 0) break;
    scores.push(next);
  }
  return scores;
}

io.on('connection', (socket) => {
  socket.on('room:create', (payload, cb) => {
    const room = createRoom(socket, payload || {});
    socket.join(room.id);
    const player = { id: socket.id, name: payload?.name || 'Host', score: 0, debt: 0, isHost: true, isDrawer: false, avatar: payload?.avatar || null };
    room.players.set(socket.id, player);
    cb?.({ ok: true, roomId: room.id, state: roomSnapshot(room) });
    io.to(room.id).emit('room:state', roomSnapshot(room));
  });

  socket.on('room:join', ({ roomId, name, avatar }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ ok: false, error: 'ROOM_NOT_FOUND' });
    if (room.players.size >= room.settings.maxPlayers) return cb?.({ ok: false, error: 'ROOM_FULL' });
    const player = { id: socket.id, name: name?.slice(0, 24) || 'Player', score: 0, debt: 0, isHost: false, isDrawer: false, avatar: avatar || null };
    room.players.set(socket.id, player);
    socket.join(room.id);
    cb?.({ ok: true, state: roomSnapshot(room) });
    io.to(room.id).emit('room:state', roomSnapshot(room));
  });

  socket.on('room:kick', ({ roomId, targetId }) => {
    const room = rooms.get(roomId);
    if (!room || socket.id !== room.hostId) return;
    if (room.players.has(targetId)) {
      io.sockets.sockets.get(targetId)?.leave(roomId);
      io.to(targetId).emit('room:kicked');
      room.players.delete(targetId);
      io.to(room.id).emit('room:state', roomSnapshot(room));
    }
  });

  socket.on('game:start', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || socket.id !== room.hostId) return;
    if (room.players.size < 2) return; // need at least drawer + guesser
    const players = [...room.players.values()];
    const drawer = players[Math.floor(Math.random() * players.length)];
    players.forEach(p => p.isDrawer = p.id === drawer.id);
    const endsAt = Date.now() + room.settings.roundTimeSec * 1000;
    room.status = 'IN_ROUND';
    room.currentRound = { number: (room.currentRound?.number || 0) + 1, drawerId: drawer.id, word: null, options: [], correctOrder: [], endsAt, strokes: [] };
    // generate word options
    room.currentRound.options = pickWords(room.settings.wordsPerRound);
    io.to(drawer.id).emit('round:wordOptions', room.currentRound.options);
    io.to(room.id).emit('room:state', roomSnapshot(room));
  });

  socket.on('round:selectWord', ({ roomId, word }) => {
    const room = rooms.get(roomId);
    if (!room || !room.currentRound) return;
    if (socket.id !== room.currentRound.drawerId) return;
    room.currentRound.word = String(word || '').trim().toLowerCase();
    io.to(room.id).emit('round:start', { drawerId: room.currentRound.drawerId, endsAt: room.currentRound.endsAt });
  });

  socket.on('draw:stroke', ({ roomId, stroke }) => {
    const room = rooms.get(roomId);
    if (!room || !room.currentRound) return;
    if (socket.id !== room.currentRound.drawerId) return;
    room.currentRound.strokes.push(stroke);
    socket.to(room.id).emit('draw:stroke', stroke);
  });

  socket.on('draw:clear', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !room.currentRound) return;
    if (socket.id !== room.currentRound.drawerId && socket.id !== room.hostId) return;
    room.currentRound.strokes = [];
    io.to(room.id).emit('draw:clear');
  });

  socket.on('chat:message', ({ roomId, text }) => {
    const room = rooms.get(roomId);
    if (!room || !room.currentRound) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    const msg = { id: Math.random().toString(36).slice(2), playerId: player.id, name: player.name, text: String(text || '').slice(0, 200) };
    io.to(room.id).emit('chat:message', msg);
    // guess check
    if (room.currentRound.word && msg.text.trim().toLowerCase() === room.currentRound.word) {
      const already = room.currentRound.correctOrder.find(e => e.playerId === player.id);
      if (!already && player.id !== room.currentRound.drawerId) {
        room.currentRound.correctOrder.push({ playerId: player.id, at: Date.now() });
        io.to(room.id).emit('guess:correct', { playerId: player.id });
      }
    }
  });

  socket.on('round:end', ({ roomId, reason }) => {
    const room = rooms.get(roomId);
    if (!room || !room.currentRound) return;
    if (socket.id !== room.hostId) return;
    endRoundAndScore(room, reason || 'HOST');
  });

  socket.on('disconnect', () => {
    // remove player from any room
    for (const room of rooms.values()) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        if (room.hostId === socket.id) {
          // if host leaves, end the room
          rooms.delete(room.id);
          io.to(room.id).emit('room:closed');
        } else {
          io.to(room.id).emit('room:state', roomSnapshot(room));
        }
      }
    }
  });
});

function endRoundAndScore(room, reason) {
  const { currentRound: r } = room;
  if (!r) return;
  const M = room.settings.maxPoints;
  const seq = scoreSequence(M);
  // score guessers in order
  r.correctOrder.forEach((entry, idx) => {
    const p = room.players.get(entry.playerId);
    if (!p) return;
    const points = seq[idx] ?? 0;
    p.score += points;
  });
  const drawer = room.players.get(r.drawerId);
  if (drawer) {
    if (r.correctOrder.length === 0) {
      // 50% chance to lose points
      if (Math.random() < 0.5) {
        const penalty = Math.floor(0.25 * M);
        drawer.score -= penalty;
        if (drawer.score < 0) drawer.debt = (drawer.debt || 0) + Math.abs(drawer.score);
      }
    } else {
      const award = Math.floor(0.75 * M);
      drawer.score += award;
    }
  }
  room.status = 'ROUND_RESULTS';
  const word = r.word;
  room.currentRound = null;
  io.to(room.id).emit('round:end', { reason, word, state: roomSnapshot(room) });
}

function pickWords(n) {
  const pool = [
    'apple','banana','cat','dog','house','tree','car','phone','computer','river','mountain','pizza','book','cake','heart','star','smile','ball','shoe','clock','plane','train','robot','dragon','rocket','ocean','island','bridge','camera'
  ];
  const out = new Set();
  while (out.size < n) out.add(pool[Math.floor(Math.random()*pool.length)]);
  return [...out];
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`server listening on ${PORT}`));
