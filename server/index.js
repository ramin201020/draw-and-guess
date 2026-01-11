import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://doodles-giok.onrender.com',
    /\.vercel\.app$/,
    /\.onrender\.com$/
  ],
  methods: ['GET', 'POST'],
  credentials: true,
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
const voiceRooms = new Map(); // Track voice chat participants
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
    maxWordLength: 10,
    totalRounds: 3,
    customWords: []
  };
}

function generateRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluded I and O to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

function createRoom(hostSocket, payload) {
  const roomId = payload?.roomId || generateRoomCode();
  const settings = { ...defaultSettings(), ...(payload?.settings || {}) };
  const room = {
    id: roomId,
    hostId: hostSocket.id,
    settings,
    players: new Map(),
    status: 'LOBBY',
    currentRound: null,
    gameState: {
      currentRoundNumber: 0,
      totalRounds: settings.totalRounds || 3,
      drawersThisRound: new Set(),
      allDrawersCompleted: false,
      autoProgressTimer: null
    },
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
    players: [...room.players.values()].map(p => ({ 
      id: p.id, 
      name: p.name, 
      score: p.score, 
      debt: p.debt, 
      isHost: p.isHost, 
      isDrawer: p.isDrawer, 
      avatar: p.avatar,
      hasDrawnThisRound: room.gameState?.drawersThisRound?.has(p.id) || false
    })),
    currentRound: room.currentRound ? {
      number: room.currentRound.number,
      drawerId: room.currentRound.drawerId,
      endsAt: room.currentRound.endsAt,
      mask: room.currentRound.maskState ? [...room.currentRound.maskState] : null,
      guessed: room.currentRound.correctOrder.map(p => p.playerId)
    } : null,
    gameState: {
      currentRoundNumber: room.gameState?.currentRoundNumber || 0,
      totalRounds: room.gameState?.totalRounds || 3,
      allDrawersCompleted: room.gameState?.allDrawersCompleted || false,
      nextDrawerName: getNextDrawerName(room),
      autoProgressCountdown: room.gameState?.autoProgressCountdown || null
    }
  };
}

function getNextDrawerName(room) {
  // With random selection, we don't know who's next until they're selected
  // Return null or a placeholder
  return null;
}

// Check if all non-drawer players have guessed correctly
function checkAllGuessed(room) {
  const round = room.currentRound;
  if (!round || !round.word) return false;
  
  const nonDrawerPlayers = [...room.players.values()].filter(
    p => p.id !== round.drawerId
  );
  
  // If there are no non-drawer players, return false
  if (nonDrawerPlayers.length === 0) return false;
  
  const guessedPlayerIds = new Set(round.correctOrder.map(e => e.playerId));
  
  return nonDrawerPlayers.every(p => guessedPlayerIds.has(p.id));
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
    
    const player = { 
      id: socket.id, 
      name: name?.slice(0, 24) || 'Player', 
      score: 0, 
      debt: 0, 
      isHost: false, 
      isDrawer: false, 
      avatar: avatar || null 
    };
    
    room.players.set(socket.id, player);
    socket.join(room.id);
    
    // Players joining mid-game will be eligible for random selection in the current round
    // if they haven't drawn yet
    if (room.status !== 'LOBBY') {
      console.log(`Player ${name} joined mid-game in room ${room.id}`);
    }
    
    cb?.({ ok: true, state: roomSnapshot(room) });
    io.to(room.id).emit('room:state', roomSnapshot(room));
  });

  // Handle room rejoin after page refresh
  socket.on('room:rejoin', ({ roomId, playerName }) => {
    const room = rooms.get(roomId?.toUpperCase());
    if (!room) {
      socket.emit('room:rejoin:failed', { reason: 'ROOM_NOT_FOUND' });
      return;
    }
    
    // Check if player was in the room (by name match since socket ID changed)
    let existingPlayer = null;
    for (const [playerId, player] of room.players.entries()) {
      if (player.name === playerName) {
        existingPlayer = { playerId, player };
        break;
      }
    }
    
    if (existingPlayer) {
      // Remove old player entry and add with new socket ID
      const { playerId: oldId, player } = existingPlayer;
      room.players.delete(oldId);
      
      // Update player with new socket ID, preserve score and state
      const updatedPlayer = {
        ...player,
        id: socket.id
      };
      
      // Update host ID if this was the host
      if (room.hostId === oldId) {
        room.hostId = socket.id;
        updatedPlayer.isHost = true;
      }
      
      // Update drawer ID if this was the drawer
      if (room.currentRound?.drawerId === oldId) {
        room.currentRound.drawerId = socket.id;
        updatedPlayer.isDrawer = true;
      }
      
      // Update drawers this round set with new socket ID
      if (room.gameState?.drawersThisRound?.has(oldId)) {
        room.gameState.drawersThisRound.delete(oldId);
        room.gameState.drawersThisRound.add(socket.id);
      }
      
      room.players.set(socket.id, updatedPlayer);
      socket.join(room.id);
      
      console.log(`Player ${playerName} rejoined room ${room.id} with new socket ${socket.id}`);
      socket.emit('room:rejoined', roomSnapshot(room));
      io.to(room.id).emit('room:state', roomSnapshot(room));
    } else {
      // Player not found, they can join as new player
      socket.emit('room:rejoin:failed', { reason: 'PLAYER_NOT_FOUND' });
    }
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
    
    // Initialize game state
    initializeGameState(room);
    
    // Start the first drawer's turn
    startNextDrawerTurn(room);
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
    
    const messageText = String(text || '').slice(0, 200);
    const isCorrectGuess = room.currentRound.word && 
      messageText.trim().toLowerCase() === room.currentRound.word.toLowerCase();
    
    // Check if this player already guessed correctly
    const alreadyGuessed = room.currentRound.correctOrder.find(e => e.playerId === player.id);
    const isDrawer = player.id === room.currentRound.drawerId;
    
    // If it's a correct guess and player hasn't guessed yet and isn't the drawer,
    // don't broadcast the message (to hide the answer from others)
    if (isCorrectGuess && !alreadyGuessed && !isDrawer) {
      room.currentRound.correctOrder.push({ playerId: player.id, at: Date.now() });
      io.to(room.id).emit('guess:correct', { playerId: player.id });
      io.to(room.id).emit('room:state', roomSnapshot(room));
      
      // Check if all non-drawer players have guessed correctly
      if (checkAllGuessed(room)) {
        endDrawerTurn(room, 'ALL_GUESSED');
      }
      return; // Don't broadcast the message containing the answer
    }
    
    // For regular messages (or if player already guessed/is drawer), broadcast normally
    const msg = { id: Math.random().toString(36).slice(2), playerId: player.id, name: player.name, text: messageText };
    io.to(room.id).emit('chat:message', msg);
  });

  socket.on('round:end', ({ roomId, reason }) => {
    const room = rooms.get(roomId);
    if (!room || !room.currentRound) return;
    if (socket.id !== room.hostId) return;
    endDrawerTurn(room, reason || 'HOST');
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
      
      // Clean up voice chat
      for (const [roomId, participants] of voiceRooms.entries()) {
        if (participants.has(socket.id)) {
          participants.delete(socket.id);
          socket.to(roomId).emit('voice:user-left', { userId: socket.id });
          socket.to(roomId).emit('voice:participants', Array.from(participants));
          
          if (participants.size === 0) {
            voiceRooms.delete(roomId);
          }
        }
      }
    }, 30000); // 30 second grace period for reconnection
  });

  // Voice chat handlers
  socket.on('voice:join', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !room.players.has(socket.id)) return;
    
    if (!voiceRooms.has(roomId)) {
      voiceRooms.set(roomId, new Set());
    }
    
    const participants = voiceRooms.get(roomId);
    participants.add(socket.id);
    
    // Notify existing participants about new user
    socket.to(roomId).emit('voice:user-joined', { userId: socket.id });
    
    // Send current participants to new user
    socket.emit('voice:participants', Array.from(participants));
    
    // Notify all participants about updated list
    io.to(roomId).emit('voice:participants', Array.from(participants));
    
    console.log(`User ${socket.id} joined voice chat in room ${roomId}`);
  });

  socket.on('voice:leave', ({ roomId }) => {
    const participants = voiceRooms.get(roomId);
    if (participants && participants.has(socket.id)) {
      participants.delete(socket.id);
      
      // Notify other participants
      socket.to(roomId).emit('voice:user-left', { userId: socket.id });
      socket.to(roomId).emit('voice:participants', Array.from(participants));
      
      if (participants.size === 0) {
        voiceRooms.delete(roomId);
      }
      
      console.log(`User ${socket.id} left voice chat in room ${roomId}`);
    }
  });

  socket.on('voice:offer', ({ roomId, targetId, offer }) => {
    const room = rooms.get(roomId);
    if (!room || !room.players.has(socket.id)) return;
    
    socket.to(targetId).emit('voice:offer', {
      fromId: socket.id,
      offer: offer
    });
  });

  socket.on('voice:answer', ({ roomId, targetId, answer }) => {
    const room = rooms.get(roomId);
    if (!room || !room.players.has(socket.id)) return;
    
    socket.to(targetId).emit('voice:answer', {
      fromId: socket.id,
      answer: answer
    });
  });

  socket.on('voice:ice-candidate', ({ roomId, targetId, candidate }) => {
    const room = rooms.get(roomId);
    if (!room || !room.players.has(socket.id)) return;
    
    socket.to(targetId).emit('voice:ice-candidate', {
      fromId: socket.id,
      candidate: candidate
    });
  });

  socket.on('voice:mute-status', ({ roomId, isMuted }) => {
    const room = rooms.get(roomId);
    if (!room || !room.players.has(socket.id)) return;
    
    socket.to(roomId).emit('voice:user-muted', {
      userId: socket.id,
      isMuted: isMuted
    });
  });
});

function initializeGameState(room) {
  const players = [...room.players.values()];
  
  room.gameState = {
    currentRoundNumber: 1,
    totalRounds: room.settings.totalRounds || 3,
    drawersThisRound: new Set(),
    allDrawersCompleted: false,
    autoProgressTimer: null,
    autoProgressCountdown: null
  };
}

function getNextDrawer(room) {
  // Get all players who haven't drawn this round
  const availablePlayers = [...room.players.values()].filter(
    p => !room.gameState.drawersThisRound.has(p.id)
  );
  
  if (availablePlayers.length === 0) {
    // All players have drawn, round is complete
    room.gameState.allDrawersCompleted = true;
    return null;
  }
  
  // Select a random player from available players
  const randomIndex = Math.floor(Math.random() * availablePlayers.length);
  return availablePlayers[randomIndex];
}

function startAutoProgressTimer(room, delay = 10000, isRoundComplete = false) {
  if (room.gameState.autoProgressTimer) {
    clearTimeout(room.gameState.autoProgressTimer);
  }
  if (room.gameState.countdownInterval) {
    clearInterval(room.gameState.countdownInterval);
  }
  
  // 10 seconds for round completion, 3 seconds for turn end
  const countdownStart = isRoundComplete ? 10 : 3;
  let countdown = countdownStart;
  room.gameState.autoProgressCountdown = countdown;
  io.to(room.id).emit('room:state', roomSnapshot(room));
  io.to(room.id).emit('autoProgress:countdown', { countdown, isRoundComplete });
  
  room.gameState.countdownInterval = setInterval(() => {
    countdown--;
    room.gameState.autoProgressCountdown = countdown;
    io.to(room.id).emit('autoProgress:countdown', { countdown, isRoundComplete });
    
    if (countdown <= 0) {
      clearInterval(room.gameState.countdownInterval);
      room.gameState.autoProgressCountdown = null;
    }
  }, 1000);
  
  room.gameState.autoProgressTimer = setTimeout(() => {
    clearInterval(room.gameState.countdownInterval);
    room.gameState.autoProgressCountdown = null;
    
    if (room.gameState.allDrawersCompleted) {
      // Move to next round or end game
      if (room.gameState.currentRoundNumber >= room.gameState.totalRounds) {
        endGame(room);
      } else {
        startNextRound(room);
      }
    } else {
      // Start next drawer's turn
      startNextDrawerTurn(room);
    }
  }, countdownStart * 1000);
}

function startNextRound(room) {
  room.gameState.currentRoundNumber++;
  room.gameState.drawersThisRound.clear();
  room.gameState.allDrawersCompleted = false;
  
  startNextDrawerTurn(room);
}

function startNextDrawerTurn(room) {
  const nextDrawer = getNextDrawer(room);
  
  if (!nextDrawer) {
    // Round complete, show results
    room.status = 'ROUND_RESULTS';
    io.to(room.id).emit('round:complete', { 
      roundNumber: room.gameState.currentRoundNumber,
      state: roomSnapshot(room) 
    });
    startAutoProgressTimer(room, 10000, true); // 10 second countdown for round completion
    return;
  }
  
  // Clear canvas for new drawer
  io.to(room.id).emit('draw:clear');
  
  // Set up new drawing turn
  const players = [...room.players.values()];
  players.forEach(p => p.isDrawer = p.id === nextDrawer.id);
  
  const endsAt = Date.now() + room.settings.roundTimeSec * 1000;
  room.status = 'IN_ROUND';
  
  if (room.currentRound) {
    clearRevealTimer(room.currentRound);
    if (room.currentRound.roundTimer) {
      clearTimeout(room.currentRound.roundTimer);
    }
  }
  
  room.currentRound = {
    number: room.gameState.currentRoundNumber,
    drawerId: nextDrawer.id,
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
  
  // Set automatic turn end timer
  room.currentRound.roundTimer = setTimeout(() => {
    console.log(`⏰ Turn for ${nextDrawer.name} in room ${room.id} ended due to timeout`);
    endDrawerTurn(room, 'TIME_UP');
  }, room.settings.roundTimeSec * 1000);
  
  // Generate word options (including custom words)
  room.currentRound.options = pickWords(room.settings.wordsPerRound, room.settings.maxWordLength || 10, room.settings.customWords || []);
  io.to(nextDrawer.id).emit('round:wordOptions', room.currentRound.options);
  io.to(room.id).emit('room:state', roomSnapshot(room));
}

function endDrawerTurn(room, reason) {
  const { currentRound: r } = room;
  if (!r) return;
  
  // Mark this drawer as completed
  room.gameState.drawersThisRound.add(r.drawerId);
  
  // Score this turn
  const M = room.settings.maxPoints;
  const seq = scoreSequence(M);
  
  // Score guessers in order
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
  
  const word = r.word;
  clearRevealTimer(r);
  room.currentRound = null;
  
  // Check if all players have drawn (compare with total player count)
  const totalPlayers = room.players.size;
  const drawnCount = room.gameState.drawersThisRound.size;
  if (drawnCount >= totalPlayers) {
    room.gameState.allDrawersCompleted = true;
  }
  
  // Emit turn end
  io.to(room.id).emit('drawer:turnEnd', { 
    reason, 
    word, 
    drawerId: r.drawerId,
    state: roomSnapshot(room) 
  });
  
  // Auto-progress to next turn or round
  startAutoProgressTimer(room, 3000, false); // 3 second countdown between turns
}

function endGame(room) {
  room.status = 'GAME_COMPLETE';
  
  // Calculate final rankings
  const players = [...room.players.values()].sort((a, b) => b.score - a.score);
  
  io.to(room.id).emit('game:complete', {
    finalRankings: players.map((p, index) => ({
      rank: index + 1,
      id: p.id,
      name: p.name,
      score: p.score,
      debt: p.debt
    })),
    state: roomSnapshot(room)
  });
  
  // Reset game state after 30 seconds
  setTimeout(() => {
    room.status = 'LOBBY';
    room.gameState.currentRoundNumber = 0;
    room.gameState.drawersThisRound.clear();
    room.gameState.allDrawersCompleted = false;
    
    // Reset player scores
    room.players.forEach(p => {
      p.score = 0;
      p.debt = 0;
      p.isDrawer = false;
    });
    
    io.to(room.id).emit('room:state', roomSnapshot(room));
  }, 30000);
}

function pickWords(n, maxWordLength = 10, customWords = []) {
  const defaultPool = [
    'apple','banana','cactus','bottle','castle','dragon','camera','guitar','rocket','mountain','pencil','notebook','cookie','window','island','sketch','pyramid','pirate','rainbow','airplane','dolphin','diamond','painter','sunrise','lantern','piano','laptop','planet','compass',
    'butterfly','elephant','giraffe','kangaroo','penguin','octopus','flamingo','hedgehog','squirrel','hamster','rabbit','turtle','lizard','spider','beetle','dragonfly','ladybug','caterpillar','grasshopper','firefly',
    'sandwich','hamburger','pizza','spaghetti','chocolate','strawberry','watermelon','pineapple','coconut','avocado','broccoli','carrot','tomato','potato','onion','garlic','pepper','mushroom','cucumber','lettuce',
    'computer','keyboard','monitor','speaker','headphone','microphone','telephone','television','radio','camera','printer','scanner','tablet','smartphone','laptop','desktop','software','hardware','internet','website',
    'bicycle','motorcycle','airplane','helicopter','submarine','spaceship','rocket','train','bus','truck','car','boat','ship','yacht','canoe','kayak','skateboard','scooter','rollerblade','snowboard'
  ].filter(word => word.length <= maxWordLength);
  
  // Add custom words that meet length requirements
  const validCustomWords = customWords
    .filter(word => word && typeof word === 'string' && word.trim().length > 0 && word.trim().length <= maxWordLength)
    .map(word => word.trim().toLowerCase());
  
  const pool = [...defaultPool, ...validCustomWords];
  const target = Math.min(n, pool.length);
  const out = new Set();
  
  while (out.size < target && pool.length > 0) {
    out.add(pool[Math.floor(Math.random() * pool.length)]);
  }
  
  return [...out];
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`server listening on ${PORT}`));
