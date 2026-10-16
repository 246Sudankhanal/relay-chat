const authView = document.getElementById('auth-view');
const chatView = document.getElementById('chat-view');
const authForm = document.getElementById('auth-form');
const authError = document.getElementById('auth-error');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const roomList = document.getElementById('room-list');
const memberList = document.getElementById('member-list');
const messagesEl = document.getElementById('messages');
const composer = document.getElementById('composer');
const messageInput = document.getElementById('message-input');
const roomNameEl = document.getElementById('room-name');
const roomDescEl = document.getElementById('room-desc');
const currentUserEl = document.getElementById('current-user');
const instanceBadge = document.getElementById('instance-badge');

let accessToken = null;
let currentUser = null;
let socket = null;
let currentRoom = 'general';
let rooms = [];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function showError(message) {
  authError.hidden = !message;
  authError.textContent = message || '';
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && path !== '/api/auth/refresh' && path !== '/api/auth/login') {
    const refreshed = await refreshSession();
    if (refreshed) {
      return api(path, options);
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

async function refreshSession() {
  try {
    const data = await api('/api/auth/refresh', { method: 'POST' });
    accessToken = data.accessToken;
    currentUser = data.user;
    return true;
  } catch {
    accessToken = null;
    currentUser = null;
    return false;
  }
}

function renderRooms() {
  roomList.innerHTML = rooms
    .map(
      (room) => `
        <button class="room-btn ${room.slug === currentRoom ? 'active' : ''}" data-slug="${room.slug}">
          # ${escapeHtml(room.name)}
        </button>`
    )
    .join('');
}

function renderMembers(members) {
  memberList.innerHTML = members
    .map((member) => `<li>${escapeHtml(member.username)}</li>`)
    .join('');
}

function appendMessage(message) {
  const mine = currentUser && message.userId === currentUser.id;
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const el = document.createElement('div');
  el.className = `msg ${mine ? 'self' : ''}`;
  el.innerHTML = `
    <span class="meta">${escapeHtml(message.username)} · ${escapeHtml(time)}</span>
    ${escapeHtml(message.text)}
  `;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderHistory(messages) {
  messagesEl.innerHTML = '';
  messages.forEach(appendMessage);
}

function connectSocket() {
  if (socket) {
    socket.disconnect();
  }

  socket = io({
    auth: { token: accessToken },
    transports: ['websocket'],
  });

  socket.on('hello', ({ instanceId, user }) => {
    instanceBadge.textContent = instanceId;
    currentUserEl.textContent = `@${user.username}`;
  });

  socket.on('connect_error', async () => {
    const ok = await refreshSession();
    if (ok) {
      connectSocket();
      joinRoom(currentRoom);
    } else {
      showChat(false);
    }
  });

  socket.on('message', (message) => {
    if (message.room === currentRoom) {
      appendMessage(message);
    }
  });

  socket.on('presence', ({ room, members }) => {
    if (room === currentRoom) {
      renderMembers(members);
    }
  });
}

function joinRoom(slug) {
  currentRoom = slug;
  const room = rooms.find((item) => item.slug === slug);
  if (room) {
    roomNameEl.textContent = room.name;
    roomDescEl.textContent = room.description;
    messageInput.placeholder = `Message #${room.slug}`;
  }
  renderRooms();
  socket.emit('join', slug, (response) => {
    if (response?.error) return;
    renderHistory(response.messages || []);
  });
}

function showChat(visible) {
  authView.hidden = visible;
  chatView.hidden = !visible;
}

async function afterAuth(data) {
  accessToken = data.accessToken;
  currentUser = data.user;
  showError('');
  const roomData = await api('/api/rooms');
  rooms = roomData.rooms;
  showChat(true);
  connectSocket();
  joinRoom(currentRoom);
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('');
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
      }),
    });
    await afterAuth(data);
  } catch (err) {
    showError(err.message);
  }
});

registerBtn.addEventListener('click', async () => {
  showError('');
  try {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
      }),
    });
    await afterAuth(data);
  } catch (err) {
    showError(err.message);
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch {
    // still drop the local session
  }
  if (socket) socket.disconnect();
  accessToken = null;
  currentUser = null;
  showChat(false);
});

roomList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-slug]');
  if (button) joinRoom(button.dataset.slug);
});

composer.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !socket) return;
  socket.emit('message', text);
  messageInput.value = '';
});

(async function boot() {
  const ok = await refreshSession();
  if (!ok) return;
  try {
    await afterAuth({ accessToken, user: currentUser });
  } catch {
    showChat(false);
  }
})();
