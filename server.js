/*
 * MONOPOLY GAME - Servidor Mejorado
 * Implementa todas las mejoras de seguridad y funcionalidad
 * 
 * Instalación de dependencias:
 * npm install express socket.io validator compression dotenv
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const compression = require('compression');

// Validación básica (si no tienes el paquete validator, usa esto)
const sanitize = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 50);
};

const app = express();
const server = http.createServer(app);

// Configuración mejorada de Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  perMessageDeflate: {
    threshold: 1024
  }
});

// Middleware
app.use(compression());
app.use(express.static('public'));

// Configuración
const DEFAULT_MONEY = 1500;
const MAX_PLAYERS_PER_ROOM = parseInt(process.env.MAX_PLAYERS) || 8;
const RECONNECT_TIMEOUT = 60000; // 60 segundos

// Almacenamiento en memoria (mejorado)
let rooms = {};
let playerRooms = new Map(); // Map de socketId -> roomId

// Rate limiting simple
const rateLimits = new Map();
function checkRateLimit(socketId, action, maxActions = 10, windowMs = 1000) {
  const key = `${socketId}:${action}`;
  const now = Date.now();
  
  if (!rateLimits.has(key)) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  const limit = rateLimits.get(key);
  
  if (now > limit.resetAt) {
    limit.count = 1;
    limit.resetAt = now + windowMs;
    return true;
  }
  
  if (limit.count >= maxActions) {
    return false;
  }
  
  limit.count++;
  return true;
}

// Limpiar rate limits viejos cada minuto
setInterval(() => {
  const now = Date.now();
  for (const [key, limit] of rateLimits.entries()) {
    if (now > limit.resetAt + 60000) {
      rateLimits.delete(key);
    }
  }
}, 60000);

// ===== FUNCIONES DE UTILIDAD =====
function generateSecureRoomId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function rand6() {
  return Math.floor(Math.random() * 6) + 1;
}

function createRoom() {
  return {
    id: generateSecureRoomId(),
    players: [],
    board: createBoard(),
    deckChance: [],
    deckCommunity: [],
    turnIndex: 0,
    started: false,
    log: [],
    createdAt: Date.now()
  };
}

function roomPublic(room) {
  return {
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      money: p.money,
      properties: p.properties,
      inJail: p.inJail,
      houses: p.houses,
      mortgaged: p.mortgaged,
      bankrupt: p.bankrupt,
      disconnected: p.disconnected || false,
      rolledThisTurn: p.rolledThisTurn || false
    })),
    board: room.board.map(b => ({
      idx: b.idx,
      name: b.name,
      type: b.type,
      color: b.color || null,
      price: b.price || null,
      rent: b.rent || null,
      owner: b.owner || null,
      houseCost: b.houseCost || null,
      mortgaged: b.mortgaged || false
    })),
    turnIndex: room.turnIndex,
    started: room.started,
    log: room.log.slice(0, 50)
  };
}

function createBoard() {
  const board = [];
  const add = (idx, name, type, opts = {}) => {
    board[idx] = Object.assign({ idx, name, type }, opts);
  };
  
  // SALIDA
  add(0, 'Rambla Poblenou', 'go');
  
  // GRUPO MARRÓN - Calles económicas
  add(1, 'C/ Pallars', 'property', { color: 'brown', price: 60, rent: [2,10,30,90,160,250], houseCost: 50, owner: null });
  add(2, 'Caja Común', 'community');
  add(3, 'C/ Tánger', 'property', { color: 'brown', price: 60, rent: [4,20,60,180,320,450], houseCost: 50, owner: null });
  
  // IMPUESTO
  add(4, 'Impuesto', 'tax', { amount: 200 });
  
  // METRO/TRAM - Transporte
  add(5, 'Metro Poblenou', 'property', { color: 'rail', price: 200, rent: [25,50,100,200], owner: null });
  
  // GRUPO AZUL CLARO
  add(6, 'C/ Pujades', 'property', { color: 'lightblue', price: 100, rent: [6,30,90,270,400,550], houseCost: 50, owner: null });
  add(7, 'Suerte', 'chance');
  add(8, 'C/ Llull', 'property', { color: 'lightblue', price: 100, rent: [6,30,90,270,400,550], houseCost: 50, owner: null });
  add(9, 'Av. Diagonal', 'property', { color: 'lightblue', price: 120, rent: [8,40,100,300,450,600], houseCost: 50, owner: null });
  
  // CÁRCEL
  add(10, '4 Cantons', 'jail');
  
  // GRUPO ROSA
  add(11, 'Parc del Centre', 'property', { color: 'pink', price: 140, rent: [10,50,150,450,625,750], houseCost: 100, owner: null });
  add(12, 'Can Framis', 'utility', { price: 150, owner: null });
  add(13, 'C/ Zamora', 'property', { color: 'pink', price: 140, rent: [10,50,150,450,625,750], houseCost: 100, owner: null });
  add(14, 'C/ Pere IV', 'property', { color: 'pink', price: 160, rent: [12,60,180,500,700,900], houseCost: 100, owner: null });
  
  // TRAM
  add(15, 'Tram Glòries', 'property', { color: 'rail', price: 200, rent: [25,50,100,200], owner: null });
  
  // GRUPO NARANJA
  add(16, 'Rambla Prim', 'property', { color: 'orange', price: 180, rent: [14,70,200,550,750,950], houseCost: 100, owner: null });
  add(17, 'Caja Común', 'community');
  add(18, 'Palo Alto', 'property', { color: 'orange', price: 180, rent: [14,70,200,550,750,950], houseCost: 100, owner: null });
  add(19, 'C/ Bilbao', 'property', { color: 'orange', price: 200, rent: [16,80,220,600,800,1000], houseCost: 100, owner: null });
  
  // PARKING GRATUITO
  add(20, 'Parking Gratis', 'free');
  
  // GRUPO ROJO - Zonas premium
  add(21, 'Parc Central', 'property', { color: 'red', price: 220, rent: [18,90,250,700,875,1050], houseCost: 150, owner: null });
  add(22, 'Suerte', 'chance');
  add(23, 'Ca l\'Alier', 'property', { color: 'red', price: 220, rent: [18,90,250,700,875,1050], houseCost: 150, owner: null });
  add(24, 'Teatre Nacional', 'property', { color: 'red', price: 240, rent: [20,100,300,750,925,1100], houseCost: 150, owner: null });
  
  // BICI/TRANSPORTE
  add(25, 'Bicing Llacuna', 'property', { color: 'rail', price: 200, rent: [25,50,100,200], owner: null });
  
  // GRUPO AMARILLO
  add(26, 'Av. Icària', 'property', { color: 'yellow', price: 260, rent: [22,110,330,800,975,1150], houseCost: 150, owner: null });
  add(27, 'Zoo Barcelona', 'property', { color: 'yellow', price: 260, rent: [22,110,330,800,975,1150], houseCost: 150, owner: null });
  add(28, 'Disseny Hub', 'utility', { price: 150, owner: null });
  add(29, 'Plaça Glòries', 'property', { color: 'yellow', price: 280, rent: [24,120,360,850,1025,1200], houseCost: 150, owner: null });
  
  // VE A LA CÁRCEL
  add(30, 'Ve a Cárcel', 'gotojail');
  
  // GRUPO VERDE - Lugares emblemáticos
  add(31, 'Torre Agbar', 'property', { color: 'green', price: 300, rent: [26,130,390,900,1100,1275], houseCost: 200, owner: null });
  add(32, '22@ District', 'property', { color: 'green', price: 300, rent: [26,130,390,900,1100,1275], houseCost: 200, owner: null });
  add(33, 'Caja Común', 'community');
  add(34, 'Centre Cult. Poblenou', 'property', { color: 'green', price: 320, rent: [28,150,450,1000,1200,1400], houseCost: 200, owner: null });
  
  // METRO
  add(35, 'Metro Llacuna', 'property', { color: 'rail', price: 200, rent: [25,50,100,200], owner: null });
  
  // GRUPO AZUL OSCURO - Lo más exclusivo
  add(36, 'Suerte', 'chance');
  add(37, 'Platja Bogatell', 'property', { color: 'darkblue', price: 350, rent: [35,175,500,1100,1300,1500], houseCost: 200, owner: null });
  add(38, 'Impuesto Lujo', 'tax', { amount: 100 });
  add(39, 'Port Olímpic', 'property', { color: 'darkblue', price: 400, rent: [50,200,600,1400,1700,2000], houseCost: 200, owner: null });
  
  return board;
}

function shuffleDecks(room) {
  room.deckChance = [
    { text: 'Avanza a Salida (cobra $200)', type: 'move', to: 0 },
    { text: 'Ve a la cárcel', type: 'jail' },
    { text: 'El banco te paga $50', type: 'money', amount: 50 },
    { text: 'Avanza a Boardwalk', type: 'move', to: 39 },
    { text: 'Paga $50 por reparaciones', type: 'money', amount: -50 }
  ];
  
  room.deckCommunity = [
    { text: 'Recibes $200', type: 'money', amount: 200 },
    { text: 'Paga $100 por gastos médicos', type: 'money', amount: -100 },
    { text: 'Ve a la cárcel', type: 'jail' },
    { text: 'Cobra $50 por venta de acciones', type: 'money', amount: 50 }
  ];
  
  room.deckChance.sort(() => Math.random() - 0.5);
  room.deckCommunity.sort(() => Math.random() - 0.5);
}

// ===== LÓGICA DEL JUEGO =====
function movePlayer(room, playerIndex, steps) {
  const player = room.players[playerIndex];
  const prev = player.position;
  player.position = (player.position + steps) % room.board.length;
  
  if (player.position < prev) {
    player.money += 200;
    room.log.unshift(`${player.name} pasa por Salida y cobra $200`);
  }
}

function movePlayerTo(room, player, targetIdx) {
  const prev = player.position;
  player.position = targetIdx;
  return (player.position < prev);
}

function resolveLanding(room, playerIndex, steps) {
  const player = room.players[playerIndex];
  const tile = room.board[player.position];
  
  if (!tile) return;
  
  // Cartas automáticas
  if (tile.type === 'chance') {
    const card = room.deckChance.shift();
    room.deckChance.push(card);
    room.log.unshift(`${player.name} roba Suerte: "${card.text}"`);
    applyCard(room, player, card, playerIndex);
    return;
  }
  
  if (tile.type === 'community') {
    const card = room.deckCommunity.shift();
    room.deckCommunity.push(card);
    room.log.unshift(`${player.name} roba Caja Común: "${card.text}"`);
    applyCard(room, player, card, playerIndex);
    return;
  }
  
  if (tile.type === 'property') {
    if (!tile.owner) {
      room.log.unshift(`${player.name} puede comprar ${tile.name} por $${tile.price}`);
    } else if (tile.owner !== player.id && !tile.mortgaged) {
      const owner = room.players.find(p => p.id === tile.owner);
      if (owner && !owner.bankrupt) {
        const rent = calculateRent(tile, owner, room, steps);
        transferMoney(room, player, owner, rent);
        room.log.unshift(`${player.name} paga $${rent} a ${owner.name}`);
      }
    }
  } else if (tile.type === 'tax') {
    player.money -= tile.amount;
    room.log.unshift(`${player.name} paga impuesto de $${tile.amount}`);
    checkBankruptcy(room, player);
  } else if (tile.type === 'gotojail') {
    sendToJail(room, playerIndex);
  } else if (tile.type === 'utility') {
    if (!tile.owner) {
      room.log.unshift(`${player.name} puede comprar ${tile.name}`);
    } else if (tile.owner !== player.id && !tile.mortgaged) {
      const owner = room.players.find(p => p.id === tile.owner);
      if (owner) {
        const ownerUtilities = room.board.filter(b => b.type === 'utility' && b.owner === owner.id).length;
        const multiplier = ownerUtilities === 2 ? 10 : 4;
        const rent = steps * multiplier;
        transferMoney(room, player, owner, rent);
        room.log.unshift(`${player.name} paga $${rent} a ${owner.name}`);
      }
    }
  }
  
  checkBankruptcy(room, player);
}

function applyCard(room, player, card, playerIndex) {
  switch (card.type) {
    case 'move':
      const passed = movePlayerTo(room, player, card.to);
      if (passed) {
        player.money += 200;
        room.log.unshift(`${player.name} cobra $200 por pasar Salida`);
      }
      resolveLanding(room, playerIndex, 0);
      break;
    case 'money':
      player.money += card.amount;
      if (card.amount < 0) {
        checkBankruptcy(room, player);
      }
      break;
    case 'jail':
      sendToJail(room, playerIndex);
      break;
  }
}

function calculateRent(tile, owner, room, lastRoll = 0) {
  if (tile.type === 'utility') {
    const utilities = room.board.filter(b => b.type === 'utility' && b.owner === owner.id).length;
    return lastRoll * (utilities === 2 ? 10 : 4);
  }
  
  if (tile.type === 'property' && tile.color === 'rail') {
    const rails = room.board.filter(b => b.color === 'rail' && b.owner === owner.id).length;
    return 25 * Math.pow(2, rails - 1);
  }
  
  const houses = owner.houses[tile.idx] || 0;
  if (houses > 0) {
    return tile.rent[houses];
  }
  
  const color = tile.color;
  if (!color) return tile.rent[0];
  
  const group = room.board.filter(b => b.color === color && b.type === 'property');
  const ownsAll = group.every(g => g.owner === owner.id);
  
  return ownsAll ? tile.rent[0] * 2 : tile.rent[0];
}

function transferMoney(room, from, to, amount) {
  if (amount <= 0) return;
  from.money -= amount;
  to.money += amount;
  checkBankruptcy(room, from);
}

function checkBankruptcy(room, player) {
  if (player.money < 0) {
    player.bankrupt = true;
    
    player.properties.forEach(pi => {
      const tile = room.board[pi];
      if (tile) {
        tile.owner = null;
        tile.mortgaged = false;
      }
    });
    
    player.properties = [];
    room.log.unshift(`${player.name} está en bancarrota 💀`);
    
    const alive = room.players.filter(p => !p.bankrupt);
    if (alive.length <= 1) {
      room.started = false;
      if (alive.length === 1) {
        room.log.unshift(`🏆 ${alive[0].name} GANA EL JUEGO! 🏆`);
      }
    }
  }
}

function sendToJail(room, playerIndex) {
  const player = room.players[playerIndex];
  player.position = 10;
  player.inJail = true;
  player.jailTurns = 0;
  room.log.unshift(`${player.name} va a la cárcel 🔒`);
}

function advanceTurn(room) {
  const n = room.players.length;
  
  // Resetear flag de tirada
  room.players.forEach(p => p.rolledThisTurn = false);
  
  for (let i = 1; i <= n; i++) {
    const idx = (room.turnIndex + i) % n;
    if (!room.players[idx].bankrupt && !room.players[idx].disconnected) {
      room.turnIndex = idx;
      room.log.unshift(`Turno de ${room.players[idx].name}`);
      break;
    }
  }
}

// ===== EVENTOS SOCKET =====
io.on('connection', socket => {
  console.log('[CONNECT]', socket.id);
  
  socket.on('createRoom', ({ name }) => {
    if (!checkRateLimit(socket.id, 'createRoom', 3, 10000)) {
      socket.emit('message', { text: 'Demasiadas peticiones. Espera un momento.', type: 'error' });
      return;
    }
    
    const safeName = sanitize(name) || 'Jugador';
    
    if (safeName.length < 2) {
      socket.emit('message', { text: 'El nombre debe tener al menos 2 caracteres', type: 'error' });
      return;
    }
    
    const room = createRoom();
    rooms[room.id] = room;
    
    room.players.push({
      id: socket.id,
      name: safeName,
      position: 0,
      money: DEFAULT_MONEY,
      properties: [],
      inJail: false,
      jailTurns: 0,
      houses: {},
      mortgaged: [],
      bankrupt: false,
      disconnected: false,
      rolledThisTurn: false,
      isHost: true
    });
    
    socket.join(room.id);
    playerRooms.set(socket.id, room.id);
    
    room.log.unshift(`${safeName} creó la sala`);
    
    socket.emit('roomCreated', { roomId: room.id });
    io.to(room.id).emit('roomState', roomPublic(room));
    
    console.log('[ROOM_CREATED]', room.id, 'by', safeName);
  });
  
  socket.on('joinRoom', ({ roomId, name }) => {
    if (!checkRateLimit(socket.id, 'joinRoom', 5, 5000)) {
      socket.emit('message', { text: 'Demasiadas peticiones', type: 'error' });
      return;
    }
    
    const safeName = sanitize(name) || 'Jugador';
    const safeRoomId = sanitize(roomId);
    
    if (safeName.length < 2) {
      socket.emit('message', { text: 'Nombre muy corto', type: 'error' });
      return;
    }
    
    const room = rooms[safeRoomId];
    
    if (!room) {
      socket.emit('message', { text: 'Sala no encontrada', type: 'error' });
      return;
    }
    
    if (room.started) {
      socket.emit('message', { text: 'La partida ya comenzó', type: 'error' });
      return;
    }
    
    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
      socket.emit('message', { text: 'Sala llena', type: 'error' });
      return;
    }
    
    if (room.players.find(p => p.id === socket.id)) {
      socket.emit('message', { text: 'Ya estás en esta sala', type: 'info' });
      socket.emit('roomJoined', { roomId: room.id });
      io.to(room.id).emit('roomState', roomPublic(room));
      return;
    }
    
    room.players.push({
      id: socket.id,
      name: safeName,
      position: 0,
      money: DEFAULT_MONEY,
      properties: [],
      inJail: false,
      jailTurns: 0,
      houses: {},
      mortgaged: [],
      bankrupt: false,
      disconnected: false,
      rolledThisTurn: false
    });
    
    socket.join(room.id);
    playerRooms.set(socket.id, room.id);
    
    room.log.unshift(`${safeName} se unió a la sala`);
    
    socket.emit('roomJoined', { roomId: room.id });
    io.to(room.id).emit('roomState', roomPublic(room));
    
    console.log('[JOIN]', safeName, 'joined', room.id);
  });
  
  socket.on('startGame', roomId => {
    const room = rooms[roomId];
    if (!room) return;
    
    if (room.started) {
      socket.emit('message', { text: 'Ya comenzó', type: 'info' });
      return;
    }
    
    if (room.players.length < 2) {
      socket.emit('message', { text: 'Se necesitan al menos 2 jugadores', type: 'error' });
      return;
    }
    
    room.started = true;
    room.turnIndex = 0;
    room.log.unshift('🎮 ¡La partida ha comenzado!');
    
    shuffleDecks(room);
    
    io.to(roomId).emit('roomState', roomPublic(room));
    io.to(roomId).emit('message', { text: '¡Juego iniciado!', type: 'success' });
    
    console.log('[GAME_START]', roomId);
  });
  
  // ===== CRÍTICO: DADOS GENERADOS EN SERVIDOR =====
  socket.on('rollDice', roomId => {
    if (!checkRateLimit(socket.id, 'rollDice', 5, 2000)) {
      socket.emit('message', { text: 'Espera antes de tirar de nuevo', type: 'error' });
      return;
    }
    
    const room = rooms[roomId];
    if (!room || !room.started) return;
    
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== room.turnIndex) {
      socket.emit('message', { text: 'No es tu turno', type: 'error' });
      return;
    }
    
    const player = room.players[playerIndex];
    if (player.bankrupt) return;
    
    if (player.rolledThisTurn) {
      socket.emit('message', { text: 'Ya tiraste los dados este turno', type: 'error' });
      return;
    }
    
    // SERVIDOR GENERA LOS DADOS
    const die1 = rand6();
    const die2 = rand6();
    const steps = die1 + die2;
    
    player.rolledThisTurn = true;
    
    // EMITIR A TODOS LOS JUGADORES
    io.to(roomId).emit('diceRolled', {
      die1,
      die2,
      playerId: socket.id,
      playerName: player.name
    });
    
    room.log.unshift(`${player.name} sacó ${die1} + ${die2} = ${steps}`);
    
    if (player.inJail) {
      if (die1 === die2) {
        player.inJail = false;
        player.jailTurns = 0;
        room.log.unshift(`${player.name} sale de la cárcel con dobles!`);
        movePlayer(room, playerIndex, steps);
        resolveLanding(room, playerIndex, steps);
      } else {
        player.jailTurns++;
        if (player.jailTurns >= 3) {
          const fine = 50;
          player.money -= fine;
          player.inJail = false;
          player.jailTurns = 0;
          room.log.unshift(`${player.name} paga $${fine} y sale`);
          movePlayer(room, playerIndex, steps);
          resolveLanding(room, playerIndex, steps);
        } else {
          room.log.unshift(`${player.name} sigue en cárcel`);
          advanceTurn(room);
        }
      }
      io.to(roomId).emit('roomState', roomPublic(room));
      return;
    }
    
    // Movimiento normal
    movePlayer(room, playerIndex, steps);
    resolveLanding(room, playerIndex, steps);
    
    // Dobles
    if (die1 === die2) {
      player._consecDoubles = (player._consecDoubles || 0) + 1;
      if (player._consecDoubles >= 3) {
        sendToJail(room, playerIndex);
        player._consecDoubles = 0;
        advanceTurn(room);
      } else {
        room.log.unshift(`${player.name} sacó dobles! Tira de nuevo`);
        player.rolledThisTurn = false;
      }
    } else {
      player._consecDoubles = 0;
      advanceTurn(room);
    }
    
    io.to(roomId).emit('roomState', roomPublic(room));
  });
  
  socket.on('buyProperty', ({ roomId, propIndex }) => {
    if (!checkRateLimit(socket.id, 'buyProperty', 3, 1000)) return;
    
    const room = rooms[roomId];
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.bankrupt) return;
    
    const tile = room.board[propIndex];
    if (!tile || !tile.price || tile.owner !== null) {
      socket.emit('message', { text: 'No se puede comprar esta propiedad', type: 'error' });
      return;
    }
    
    if (player.position !== propIndex) {
      socket.emit('message', { text: 'No estás en esa casilla', type: 'error' });
      return;
    }
    
    if (player.money < tile.price) {
      socket.emit('message', { text: 'No tienes suficiente dinero', type: 'error' });
      return;
    }
    
    player.money -= tile.price;
    tile.owner = player.id;
    player.properties.push(propIndex);
    
    room.log.unshift(`${player.name} compró ${tile.name} por $${tile.price}`);
    io.to(roomId).emit('roomState', roomPublic(room));
    socket.emit('message', { text: `Compraste ${tile.name}!`, type: 'success' });
  });
  
  socket.on('endTurn', roomId => {
    const room = rooms[roomId];
    if (!room) return;
    
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== room.turnIndex) return;
    
    advanceTurn(room);
    io.to(roomId).emit('roomState', roomPublic(room));
  });
  
  socket.on('build', ({ roomId, propIndex }) => {
    if (!checkRateLimit(socket.id, 'build', 3, 1000)) return;
    
    const room = rooms[roomId];
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    const tile = room.board[propIndex];
    
    if (!player || !tile || tile.owner !== player.id) return;
    
    const houses = player.houses[propIndex] || 0;
    if (houses >= 5) {
      socket.emit('message', { text: 'Máximo de casas alcanzado', type: 'error' });
      return;
    }
    
    const cost = tile.houseCost || Math.floor(tile.price / 2);
    if (player.money < cost) {
      socket.emit('message', { text: 'No tienes dinero suficiente', type: 'error' });
      return;
    }
    
    player.money -= cost;
    player.houses[propIndex] = houses + 1;
    
    room.log.unshift(`${player.name} construyó en ${tile.name} (${player.houses[propIndex]} casas)`);
    io.to(roomId).emit('roomState', roomPublic(room));
    socket.emit('message', { text: 'Casa construida!', type: 'success' });
  });
  
  socket.on('mortgageProperty', ({ roomId, propIndex }) => {
    if (!checkRateLimit(socket.id, 'mortgage', 3, 1000)) return;
    
    const room = rooms[roomId];
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    const tile = room.board[propIndex];
    
    if (!player || !tile || tile.owner !== player.id) return;
    
    if (player.houses[propIndex]) {
      socket.emit('message', { text: 'Vende las casas primero', type: 'error' });
      return;
    }
    
    if (tile.mortgaged) {
      socket.emit('message', { text: 'Ya está hipotecada', type: 'error' });
      return;
    }
    
    tile.mortgaged = true;
    player.mortgaged.push(propIndex);
    player.money += Math.floor(tile.price / 2);
    
    room.log.unshift(`${player.name} hipotecó ${tile.name}`);
    io.to(roomId).emit('roomState', roomPublic(room));
    socket.emit('message', { text: 'Propiedad hipotecada', type: 'success' });
  });
  
  socket.on('disconnecting', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    
    const room = rooms[roomId];
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    
    // Marcar como desconectado, no eliminar inmediatamente
    player.disconnected = true;
    room.log.unshift(`${player.name} se desconectó`);
    
    // Dar tiempo para reconectar
    setTimeout(() => {
      if (player.disconnected) {
        // Eliminar si sigue desconectado después de 60 segundos
        room.players = room.players.filter(p => p.id !== socket.id);
        room.log.unshift(`${player.name} fue eliminado por timeout`);
        
        if (room.players.length === 0) {
          delete rooms[roomId];
          console.log('[ROOM_DELETED]', roomId);
        } else {
          io.to(roomId).emit('roomState', roomPublic(room));
        }
      }
    }, RECONNECT_TIMEOUT);
    
    io.to(roomId).emit('roomState', roomPublic(room));
    playerRooms.delete(socket.id);
    
    console.log('[DISCONNECT]', socket.id, 'from', roomId);
  });
});

// Limpieza de salas viejas cada hora
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 3600000;
  
  for (const [roomId, room] of Object.entries(rooms)) {
    if (now - room.createdAt > ONE_HOUR && !room.started) {
      delete rooms[roomId];
      console.log('[CLEANUP] Deleted inactive room:', roomId);
    }
  }
}, 3600000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎲 Monopoly Server v2.0`);
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📊 Jugadores máximos por sala: ${MAX_PLAYERS_PER_ROOM}`);
  console.log(`⏱️  Timeout de reconexión: ${RECONNECT_TIMEOUT}ms`);
});