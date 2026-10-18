import { io } from 'socket.io-client';

const password = 'password123';

async function readData(res) {
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error?.message || `HTTP ${res.status}`);
  }
  return payload.data;
}

async function auth(username) {
  const register = await fetch('http://127.0.0.1:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (register.ok) return readData(register);

  const login = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return readData(login);
}

function connect(url, token) {
  return new Promise((resolve, reject) => {
    const socket = io(url, { auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

const alice = await auth('scale_alice');
const bob = await auth('scale_bob');
const serverA = await connect('http://127.0.0.1:3000', alice.accessToken);
const serverB = await connect('http://127.0.0.1:3001', bob.accessToken);

await Promise.all([
  new Promise((resolve) => serverA.emit('join', 'general', resolve)),
  new Promise((resolve) => serverB.emit('join', 'general', resolve)),
]);

const gotIt = new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    reject(new Error('Bob on :3001 never received Alice’s message from :3000'));
  }, 4000);
  serverB.on('message', (message) => {
    if (message.text === 'ping-across-servers') {
      clearTimeout(timer);
      resolve(message);
    }
  });
});

serverA.emit('message', 'ping-across-servers');
const message = await gotIt;
console.log(`ok: ${message.username} -> server-b via Redis: "${message.text}"`);
serverA.close();
serverB.close();
