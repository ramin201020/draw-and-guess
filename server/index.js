import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173']
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
  credentials: false,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/health', (_, res) => res.json({ 
  ok: true, 
  timestamp: new Date().toISOString(),
  uptime: process.uptime()
}));

// Test endpoint to check socket connections
app.get('/test-socket', (_, res) => {
  const connectedSockets = io.sockets.sockets.size;
  res.json({
    ok: true,
    connectedSockets,
    socketIds: Array.from(io.sockets.sockets.keys())
  });
});

// API endpoint for room creation
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

// Enhanced Socket.IO configuration
const io = new Server(server, {
  cors: corsOptions,
  // Performance optimizations
  pingTimeout: 120000, // Increased from 60s to 2 minutes
  pingInterval: 30000,  // Increased from 25s to 30s
  upgradeTimeout: 30000, // Increased from 10s to 30s
  maxHttpBufferSize: 1e6, // 1MB
  // Transport configuration
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  // Compression
  compression: true,
  // Connection state recovery - enhanced for mobile
  connectionStateRecovery: {
    maxDisconnectionDuration: 10 * 60 * 1000, // Increased to 10 minutes
    skipMiddlewares: true,
  }
});

// In-memory state
const rooms = new Map();
const LETTER_REVEAL_INTERVAL_MS = 60_000; // Changed to 60 seconds
const SHORT_WORD_DELAY_MS = 60_000;
const MAX_WORD_LENGTH = 15; // Made configurable

function initializeMaskState(word) {
  if (!word) return null;
  return word.split('').map((char) => (char === ' ' ? ' ' : '_'));
}

function maskHasHidden(maskState) {
  return Array.isArray(maskState) && maskState.some((char) => char === '_');
}

function clearRevealTimer(round) {
  if (round?.revealTimer) {
    clearTimeout(round.revealTimer);
    round.revealTimer = null;
  }
  if (round?.roundTimer) {
    clearTimeout(round.roundTimer);
    round.roundTimer = null;
  }
}

function emitMaskUpdate(room) {
  const round = room.currentRound;
  if (!round?.maskState) return;
  io.to(room.id).emit('round:maskUpdate', {
    roomId: room.id,
    mask: [...round.maskState],
  });
}

function revealRandomLetter(room) {
  const round = room.currentRound;
  if (!round?.maskState || !round.word) return false;
  const hiddenIndices = [];
  round.maskState.forEach((char, idx) => {
    if (char === '_') hiddenIndices.push(idx);
  });
  if (hiddenIndices.length === 0) {
    clearRevealTimer(round);
    return false;
  }
  const randomIndex = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
  const letter = round.word[randomIndex] || '';
  round.maskState[randomIndex] = letter.toUpperCase();
  round.revealedLetters = (round.revealedLetters || 0) + 1;
  emitMaskUpdate(room);
  return true;
}

function scheduleMaskReveal(room) {
  const round = room.currentRound;
  if (!round?.word || !round.maskState) return;
  clearRevealTimer(round);
  if (!maskHasHidden(round.maskState)) return;
  
  // Check if we've reached the maximum letters revealed
  const maxRevealed = room.settings.maxLettersRevealed || 4;
  if (round.revealedLetters >= maxRevealed) {
    console.log(`Max letters revealed (${maxRevealed}) reached for room ${room.id}`);
    return;
  }
  
  const sanitizedLength = round.word.replace(/\s/g, '').length;
  const isShortWord = sanitizedLength <= 3;
  const delay = isShortWord ? SHORT_WORD_DELAY_MS : LETTER_REVEAL_INTERVAL_MS;
  
  round.revealTimer = setTimeout(() => {
    const revealed = revealRandomLetter(room);
    if (!revealed) return;
    
    // Continue revealing if we haven't reached the max and there are still hidden letters
    if (round.revealedLetters < maxRevealed && maskHasHidden(round.maskState)) {
      scheduleMaskReveal(room);
    }
  }, delay);
}

function destroyRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.currentRound) {
    clearRevealTimer(room.currentRound);
  }
  rooms.delete(roomId);
  io.to(roomId).emit('room:closed');
}

function defaultSettings() {
  return { 
    maxPoints: 300, 
    roundTimeSec: 90, 
    wordsPerRound: 3, 
    maxPlayers: 12,
    maxLettersRevealed: 4,
    maxWordLength: 10
  };
}

function createRoom(hostSocket, payload) {
  const roomId = (payload?.roomId || Math.random().toString(36).slice(2, 8)).toUpperCase();
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
      mask: room.currentRound.maskState ? [...room.currentRound.maskState] : null,
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
  console.log('New socket connection:', socket.id);
  
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', socket.id, 'reason:', reason);
    
    // Don't immediately remove player on mobile disconnect
    if (reason === 'transport close' || reason === 'ping timeout') {
      console.log('Mobile-friendly disconnect detected, keeping player in room temporarily');
      return;
    }
    
    // Only remove player for intentional disconnects
    for (const room of rooms.values()) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        if (room.hostId === socket.id) {
          destroyRoom(room.id);
        } else {
          io.to(room.id).emit('room:state', roomSnapshot(room));
        }
      }
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', socket.id, error);
  });
  socket.on('room:create', (payload, cb) => {
    const room = createRoom(socket, payload || {});
    socket.join(room.id);
    const player = { id: socket.id, name: payload?.name || 'Host', score: 0, debt: 0, isHost: true, isDrawer: false, avatar: payload?.avatar || null };
    room.players.set(socket.id, player);
    cb?.({ ok: true, roomId: room.id, state: roomSnapshot(room) });
    io.to(room.id).emit('room:state', roomSnapshot(room));
  });

  socket.on('room:join', ({ roomId, name, avatar }, cb) => {
    const room = rooms.get(roomId?.toUpperCase());
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

  socket.on('room:leave', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !room.players.has(socket.id)) return;
    
    room.players.delete(socket.id);
    socket.leave(roomId);
    
    // If host leaves, destroy the room
    if (room.hostId === socket.id) {
      destroyRoom(room.id);
    } else {
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
    const nextRoundNumber = (room.currentRound?.number || 0) + 1;
    if (room.currentRound) {
      clearRevealTimer(room.currentRound);
      // Clear any existing round timer
      if (room.currentRound.roundTimer) {
        clearTimeout(room.currentRound.roundTimer);
      }
    }
    room.currentRound = {
      number: nextRoundNumber,
      drawerId: drawer.id,
      word: null,
      options: [],
      correctOrder: [],
      endsAt,
      strokes: [],
      maskState: null,
      revealTimer: null,
      roundTimer: null,
      revealedLetters: 0
    };
    
    // Set automatic round end timer
    room.currentRound.roundTimer = setTimeout(() => {
      console.log(`⏰ Round ${nextRoundNumber} in room ${roomId} ended due to timeout`);
      endRoundAndScore(room, 'TIME_UP');
    }, room.settings.roundTimeSec * 1000);
    
    // generate word options
    room.currentRound.options = pickWords(room.settings.wordsPerRound, room.settings.maxWordLength || 10);
    io.to(drawer.id).emit('round:wordOptions', room.currentRound.options);
    io.to(room.id).emit('room:state', roomSnapshot(room));
  });

  socket.on('round:selectWord', ({ roomId, word }) => {
    const room = rooms.get(roomId);
    if (!room || !room.currentRound) return;
    if (socket.id !== room.currentRound.drawerId) return;
    let chosenWord = String(word || '').trim().toLowerCase();
    if (!chosenWord) return;
    
    const maxLength = room.settings.maxWordLength || 10;
    if (chosenWord.length > maxLength) {
      chosenWord = chosenWord.slice(0, maxLength);
    }
    
    room.currentRound.word = chosenWord;
    room.currentRound.maskState = initializeMaskState(chosenWord);
    room.currentRound.revealedLetters = 0;
    emitMaskUpdate(room);
    scheduleMaskReveal(room);
    io.to(room.id).emit('round:start', {
      drawerId: room.currentRound.drawerId,
      endsAt: room.currentRound.endsAt,
      mask: [...room.currentRound.maskState]
    });
    io.to(room.id).emit('room:state', roomSnapshot(room));
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

  socket.on('draw:fill', ({ roomId, x, y, color, canvasWidth, canvasHeight }) => {
    const room = rooms.get(roomId);
    if (!room || !room.currentRound) return;
    if (socket.id !== room.currentRound.drawerId) return;
    socket.to(room.id).emit('draw:fill', { x, y, color, canvasWidth, canvasHeight });
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

  socket.on('room:leave', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !room.players.has(socket.id)) return;
    
    room.players.delete(socket.id);
    socket.leave(roomId);
    
    // If host leaves, destroy room
    if (room.hostId === socket.id) {
      destroyRoom(room.id);
    } else {
      io.to(room.id).emit('room:state', roomSnapshot(room));
    }
  });

  socket.on('disconnect', () => {
    // Delayed cleanup for mobile reconnection
    setTimeout(() => {
      for (const room of rooms.values()) {
        if (room.players.has(socket.id)) {
          // Check if socket reconnected
          const reconnectedSocket = io.sockets.sockets.get(socket.id);
          if (!reconnectedSocket) {
            room.players.delete(socket.id);
            if (room.hostId === socket.id) {
              destroyRoom(room.id);
            } else {
              io.to(room.id).emit('room:state', roomSnapshot(room));
            }
          }
        }
      }
    }, 30000); // 30 second grace period for reconnection
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
  clearRevealTimer(r);
  room.currentRound = null;
  io.to(room.id).emit('round:end', { reason, word, state: roomSnapshot(room) });
}

function pickWords(n, maxWordLength = 10) {
  const pool = [
    'apple','banana','cactus','bottle','castle','dragon','camera','guitar','rocket','mountain','pencil','notebook','cookie','window','island','sketch','pyramid','pirate','rainbow','airplane','dolphin','diamond','painter','sunrise','lantern','piano','laptop','planet','compass',
    'butterfly','elephant','giraffe','kangaroo','penguin','octopus','flamingo','hedgehog','squirrel','hamster','rabbit','turtle','lizard','spider','beetle','dragonfly','ladybug','caterpillar','grasshopper','firefly',
    'sandwich','hamburger','pizza','spaghetti','chocolate','strawberry','watermelon','pineapple','coconut','avocado','broccoli','carrot','tomato','potato','onion','garlic','pepper','mushroom','cucumber','lettuce',
    'computer','keyboard','monitor','speaker','headphone','microphone','telephone','television','radio','camera','printer','scanner','tablet','smartphone','laptop','desktop','software','hardware','internet','website',
    'bicycle','motorcycle','airplane','helicopter','submarine','spaceship','rocket','train','bus','truck','car','boat','ship','yacht','canoe','kayak','skateboard','scooter','rollerblade','snowboard'
  ].filter(word => word.length <= maxWordLength);
  const target = Math.min(n, pool.length);
  const out = new Set();
  while (out.size < target) {
    out.add(pool[Math.floor(Math.random() * pool.length)]);
  }
  return [...out];
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`server listening on ${PORT}`));
