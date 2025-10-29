/* 
 * MONOPOLY GAME - Cliente Final Corregido
 * Input de sala completamente editable
 * Botón de crear sala funcional
 */

const socket = io();
let state = null;
let myId = null;
let currentRoomId = null;

// Referencias DOM - SIMPLIFICADAS
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const startBtn = document.getElementById('startBtn');
const rollBtn = document.getElementById('rollBtn');
const endBtn = document.getElementById('endBtn');
const buyBtn = document.getElementById('buyBtn');
const buildBtn = document.getElementById('buildBtn');
const mortBtn = document.getElementById('mortBtn');
const nameInput = document.getElementById('name');
const roomInput = document.getElementById('room');
const playersList = document.getElementById('playersList');
const turnInfo = document.getElementById('turnInfo');
const moneyInfo = document.getElementById('moneyInfo');
const boardInner = document.getElementById('boardInner');
const logEl = document.getElementById('log');
const diceSmall = document.getElementById('diceSmall');
const modalRoot = document.getElementById('modalRoot');
const alertsDiv = document.getElementById('alerts');
const roomInfo = document.getElementById('roomInfo');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const copyRoomBtn = document.getElementById('copyRoomBtn');
const playerCount = document.getElementById('playerCount');

// Cargar nombre guardado
const savedName = localStorage.getItem('playerName');
if (savedName) {
  nameInput.value = savedName;
}

// Auto-guardar nombre al escribir
nameInput.addEventListener('input', (e) => {
  localStorage.setItem('playerName', e.target.value);
});

// Convertir sala a mayúsculas
roomInput.addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase();
});

// Utilidades
function showAlert(message, type = 'info') {
  const alert = document.createElement('div');
  alert.className = `alert ${type}`;
  alert.textContent = message;
  alertsDiv.appendChild(alert);
  setTimeout(() => alert.remove(), 5000);
}

function log(txt) {
  const d = document.createElement('div');
  d.textContent = `[${new Date().toLocaleTimeString()}] ${txt}`;
  logEl.prepend(d);
  while (logEl.children.length > 50) {
    logEl.removeChild(logEl.lastChild);
  }
}

function sanitizeInput(input) {
  return input.replace(/[<>]/g, '').trim().substring(0, 20);
}

// ===== BOTÓN CREAR SALA =====
createBtn.onclick = () => {
  const name = sanitizeInput(nameInput.value) || 'Jugador';
  
  if (name.length < 2) {
    showAlert('El nombre debe tener al menos 2 caracteres', 'error');
    nameInput.focus();
    return;
  }
  
  console.log('[CREATE] Creando sala con nombre:', name);
  localStorage.setItem('playerName', name);
  socket.emit('createRoom', { name });
  log('Creando nueva sala...');
  
  // Feedback visual
  createBtn.disabled = true;
  createBtn.textContent = 'Creando...';
  setTimeout(() => {
    createBtn.disabled = false;
    createBtn.textContent = 'Crear Sala';
  }, 2000);
};

// ===== BOTÓN UNIRSE A SALA =====
joinBtn.onclick = () => {
  const name = nameInput.value.trim();
  const roomId = roomInput.value.trim();
  if (!name || name.length < 2) {
    alert("Nombre requerido");
    return;
  }
  if (!roomId) {
    alert("ID de sala requerido");
    return;
  }
  socket.emit('joinRoom', { name, roomId });
};

  
  console.log('[JOIN] Uniéndose a sala:', roomId, 'con nombre:', name);
  localStorage.setItem('playerName', name);
  socket.emit('joinRoom', { roomId, name });
  log(`Intentando unirse a sala ${roomId}...`);
  
  // Feedback visual
  joinBtn.disabled = true;
  joinBtn.textContent = 'Uniéndose...';
  setTimeout(() => {
    joinBtn.disabled = false;
    joinBtn.textContent = 'Unirse';
  }, 2000);
};

// Comenzar juego
startBtn.onclick = () => {
  if (!currentRoomId) return;
  socket.emit('startGame', currentRoomId);
};

// Copiar ID de sala
copyRoomBtn.onclick = () => {
  navigator.clipboard.writeText(currentRoomId).then(() => {
    showAlert('✅ ID copiado: ' + currentRoomId, 'success');
    copyRoomBtn.textContent = '✓ Copiado';
    setTimeout(() => {
      copyRoomBtn.textContent = '📋 Copiar';
    }, 2000);
  }).catch(() => {
    // Fallback si clipboard no está disponible
    showAlert('ID de sala: ' + currentRoomId, 'info');
  });
};

// ===== DADOS =====
rollBtn.onclick = () => {
  if (!currentRoomId) return;
  console.log('[ROLL] Solicitando tirada al servidor');
  showDiceLoadingModal();
  socket.emit('rollDice', currentRoomId);
};

function showDiceLoadingModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-simple';
  modal.id = 'diceModal';
  
  const inner = document.createElement('div');
  inner.style.textAlign = 'center';
  
  const diceBox = document.createElement('div');
  diceBox.className = 'diceBox';
  
  const a = document.createElement('div');
  a.className = 'dieSimple';
  a.id = 'die1';
  const b = document.createElement('div');
  b.className = 'dieSimple';
  b.id = 'die2';
  
  a.textContent = '?';
  b.textContent = '?';
  
  diceBox.appendChild(a);
  diceBox.appendChild(b);
  
  const caption = document.createElement('div');
  caption.className = 'caption';
  caption.id = 'diceCaption';
  caption.textContent = 'Tirando dados...';
  
  inner.appendChild(diceBox);
  inner.appendChild(caption);
  modal.appendChild(inner);
  modalRoot.appendChild(modal);
}

function showDiceResult(v1, v2, playerId, playerName) {
  const modal = document.getElementById('diceModal');
  if (!modal) {
    showDiceLoadingModal();
    setTimeout(() => showDiceResult(v1, v2, playerId, playerName), 100);
    return;
  }
  
  const die1 = document.getElementById('die1');
  const die2 = document.getElementById('die2');
  const caption = document.getElementById('diceCaption');
  
  let frames = 0;
  const ticks = 8;
  const timer = setInterval(() => {
    frames++;
    die1.textContent = Math.floor(Math.random() * 6) + 1;
    die2.textContent = Math.floor(Math.random() * 6) + 1;
    die1.classList.add('diePulse');
    die2.classList.add('diePulse');
    
    setTimeout(() => {
      die1.classList.remove('diePulse');
      die2.classList.remove('diePulse');
    }, 150);
    
    if (frames >= ticks) {
      clearInterval(timer);
      die1.textContent = v1;
      die2.textContent = v2;
      
      const total = v1 + v2;
      const isDouble = v1 === v2;
      
      caption.textContent = `${playerName || 'Jugador'} sacó: ${v1} + ${v2} = ${total}`;
      if (isDouble) {
        caption.textContent += ' 🎲 ¡DOBLES!';
      }
      
      diceSmall.textContent = `${v1} + ${v2} = ${total}`;
      
      setTimeout(() => {
        if (modalRoot.contains(modal)) {
          modalRoot.removeChild(modal);
        }
      }, 1800);
    }
  }, 100);
}

// Acciones
endBtn.onclick = () => {
  if (!currentRoomId) return;
  socket.emit('endTurn', currentRoomId);
};

buyBtn.onclick = () => {
  if (!state || !currentRoomId) return;
  const me = state.players.find(p => p.id === myId);
  if (!me) return;
  
  const tile = state.board[me.position];
  if (tile && tile.price && tile.owner === null) {
    socket.emit('buyProperty', { roomId: currentRoomId, propIndex: tile.idx });
  }
};

buildBtn.onclick = () => {
  if (!state || !currentRoomId) return;
  const me = state.players.find(p => p.id === myId);
  if (!me) return;
  
  const candidate = me.properties.find(pi => (me.houses[pi] || 0) < 5);
  if (candidate !== undefined) {
    socket.emit('build', { roomId: currentRoomId, propIndex: candidate });
  } else {
    showAlert('No puedes construir más casas', 'info');
  }
};

mortBtn.onclick = () => {
  if (!state || !currentRoomId) return;
  const me = state.players.find(p => p.id === myId);
  if (!me) return;
  
  const candidate = me.properties.find(pi => !state.board[pi].mortgaged);
  if (candidate !== undefined) {
    socket.emit('mortgageProperty', { roomId: currentRoomId, propIndex: candidate });
  } else {
    showAlert('No tienes propiedades para hipotecar', 'info');
  }
};

// ===== EVENTOS SOCKET =====
socket.on('connect', () => {
  myId = socket.id;
  console.log('[SOCKET] Conectado:', myId);
  showAlert('✅ Conectado al servidor', 'success');
});

socket.on('disconnect', () => {
  console.log('[SOCKET] Desconectado');
  showAlert('❌ Desconectado. Reconectando...', 'error');
});

socket.on('message', m => {
  const msg = m.text || JSON.stringify(m);
  log(msg);
  
  if (m.type === 'error') showAlert(msg, 'error');
  else if (m.type === 'success') showAlert(msg, 'success');
  else if (m.type === 'info') showAlert(msg, 'info');
});

socket.on('roomCreated', ({ roomId }) => {
  currentRoomId = roomId;
  roomIdDisplay.textContent = roomId;
  roomInfo.style.display = 'block';
  startBtn.disabled = false;
  log(`✅ Sala creada: ${roomId}`);
  showAlert(`Sala creada: ${roomId}. Comparte este ID`, 'success');
  
  // Mostrar el ID en el input para que otros lo vean
  roomInput.value = roomId;
});

socket.on('roomJoined', ({ roomId }) => {
  currentRoomId = roomId;
  roomIdDisplay.textContent = roomId;
  roomInfo.style.display = 'block';
  log(`✅ Unido a sala: ${roomId}`);
  showAlert(`Unido a sala ${roomId}`, 'success');
});

socket.on('roomState', s => {
  state = s;
  renderState();
});

socket.on('diceRolled', ({ die1, die2, playerId, playerName }) => {
  console.log('[DICE] Dados del servidor:', die1, die2);
  showDiceResult(die1, die2, playerId, playerName);
});

// ===== RENDER =====
function renderState() {
  if (!state) return;
  
  playersList.innerHTML = '';
  playerCount.textContent = state.players.length;
  
  state.players.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'playerCard';
    
    if (p.id === myId) card.classList.add('active');
    if (p.disconnected) card.classList.add('disconnected');
    
    const token = document.createElement('div');
    token.className = 'token';
    token.style.background = colorFor(i);
    token.textContent = i + 1;
    
    const info = document.createElement('div');
    info.style.flex = '1';
    
    let statusIcon = '';
    if (p.inJail) statusIcon = '🔒';
    if (p.bankrupt) statusIcon = '💀';
    if (p.disconnected) statusIcon = '📡';
    
    info.innerHTML = `
      <strong>${p.name} ${statusIcon}</strong>
      <div style="font-size:12px;color:#666;margin-top:2px">
        💰 $${p.money} • 📍 Pos ${p.position}
        ${p.properties.length > 0 ? ` • 🏠 ${p.properties.length}` : ''}
      </div>
    `;
    
    card.appendChild(token);
    card.appendChild(info);
    playersList.appendChild(card);
  });
  
  const current = state.players[state.turnIndex];
  turnInfo.textContent = current ? current.name : '-';
  
  const me = state.players.find(p => p.id === myId);
  moneyInfo.textContent = me ? ('$' + me.money) : '$0';
  
  const myTurn = me && current && me.id === current.id && state.started && !me.bankrupt;
  rollBtn.disabled = !myTurn || me?.rolledThisTurn;
  endBtn.disabled = !myTurn;
  
  const onMyProperty = me && state.board[me.position];
  buyBtn.disabled = !(
    myTurn && 
    onMyProperty && 
    onMyProperty.price && 
    onMyProperty.owner === null &&
    me.money >= onMyProperty.price
  );
  
  buildBtn.disabled = !(me && me.properties.length > 0);
  mortBtn.disabled = !(me && me.properties.length > 0);
  startBtn.disabled = state.started || state.players.length < 2;
  
  renderBoard();
  
  logEl.innerHTML = '';
  (state.log || []).slice(0, 50).forEach(l => {
    const div = document.createElement('div');
    div.textContent = l;
    logEl.appendChild(div);
  });
}

function renderBoard() {
  boardInner.innerHTML = '';
  const tileSize = 78;
  const offset = 10;
  
  state.board.forEach(t => {
    const c = getTileCoords(t.idx);
    const el = document.createElement('div');
    el.className = 'tile';
    el.style.left = (c[0] * tileSize + offset) + 'px';
    el.style.top = (c[1] * tileSize + offset) + 'px';
    
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = t.name;
    el.appendChild(title);
    
    if (t.color) {
      const bar = document.createElement('div');
      bar.className = 'colorBar';
      bar.style.background = colorForName(t.color);
      el.appendChild(bar);
    }
    
    if (t.price) {
      const price = document.createElement('div');
      price.style.fontSize = '11px';
      price.style.color = '#333';
      price.style.fontWeight = '600';
      price.textContent = '$' + t.price;
      el.appendChild(price);
    }
    
    const markers = document.createElement('div');
    markers.className = 'playersMarkers';
    state.players.forEach((pl, i) => {
      if (pl.position === t.idx && !pl.bankrupt) {
        const mk = document.createElement('div');
        mk.className = 'tokenSmall';
        mk.style.background = colorFor(i);
        markers.appendChild(mk);
      }
    });
    el.appendChild(markers);
    
    if (t.owner) {
      const ownerIdx = state.players.findIndex(p => p.id === t.owner);
      if (ownerIdx >= 0) {
        const badge = document.createElement('div');
        badge.className = 'ownerBadge';
        badge.style.background = colorFor(ownerIdx);
        el.appendChild(badge);
      }
    }
    
    if (t.mortgaged) {
      const mortLabel = document.createElement('div');
      mortLabel.style.cssText = 'position:absolute;top:2px;right:2px;font-size:10px;background:#f44336;color:#fff;padding:1px 3px;border-radius:3px';
      mortLabel.textContent = 'HIP';
      el.appendChild(mortLabel);
    }
    
    boardInner.appendChild(el);
  });
}

function getTileCoords(pos) {
  const n = 11;
  const ring = [];
  for (let x = n - 1; x >= 0; x--) ring.push([x, n - 1]);
  for (let y = n - 2; y >= 1; y--) ring.push([0, y]);
  for (let x = 0; x <= n - 1; x++) ring.push([x, 0]);
  for (let y = 1; y <= n - 2; y++) ring.push([n - 1, y]);
  return ring[pos] || [0, 0];
}

function colorFor(i) {
  const cols = ['#d32f2f', '#1976d2', '#388e3c', '#f57c00', '#9c27b0', '#607d8b', '#00796b', '#c2185b'];
  return cols[i % cols.length];
}

function colorForName(n) {
  const map = {
    brown: '#6f4f28', lightblue: '#03a9f4', pink: '#ec407a', orange: '#fb8c00',
    red: '#e53935', yellow: '#fbc02d', green: '#2e7d32', darkblue: '#283593',
    rail: '#444', utility: '#888'
  };
  return map[n] || '#ccc';
}

console.log('🎲 Monopoly Client v2.0 Final - Cargado correctamente')