# Relay

Realtime chat that still works when you run more than one Node process.

This is a backend-heavy portfolio project: custom JWT auth, Socket.IO, and Redis pub/sub for horizontal scaling. Kafka is intentionally not here. Chat fan-out is ephemeral; Redis is the tool Socket.IO actually uses for multi-server broadcasts.

## Why this exists

A recruiter can clone it, start two servers, and watch a message sent on `:3000` appear on `:3001`. That is the whole point.

- **Custom JWT** — access tokens (15m) on HTTP `Authorization` and on the Socket.IO handshake. Refresh tokens are opaque, hashed in MongoDB, stored in an httpOnly cookie, and rotated on every refresh.
- **WebSockets** — Socket.IO for rooms, history, and presence. Username always comes from the token, never from the client payload.
- **Redis pub/sub** — `@socket.io/redis-adapter` so every Node instance shares emits. Redis hashes also hold who is online in each room, so presence is cluster-wide too.
- **MongoDB** — users and the last messages in a room.

```
Browser ── JWT ──► Express (REST)
Browser ── JWT ──► Socket.IO ── Redis adapter ──► other Node processes
                         │
                         ├── Redis (presence)
                         └── MongoDB (users + messages)
```

## Quick start

Needs Docker (Mongo + Redis) and Node 18+.

```bash
pnpm docker:up
cp .env.example .env
pnpm install --ignore-workspace
pnpm start
```

`--ignore-workspace` keeps packages in this folder if a parent `pnpm-workspace.yaml` exists. Docker is optional if MongoDB and Redis are already running locally.

Open [http://127.0.0.1:3000](http://127.0.0.1:3000), create two accounts, pick a room, send messages.

### Prove it scales

Two terminals, same Redis:

```bash
pnpm start:a   # :3000
pnpm start:b   # :3001
```

Log in on each port. The badge in the sidebar shows `server-a` or `server-b`. Messages and online users still line up because Redis is the bus, not the process memory.

```bash
pnpm scale-check
```

That script logs Alice into `:3000` and Bob into `:3001`, then asserts Bob receives Alice’s message. If Redis is the adapter, it prints `ok`.

## Auth flow

1. Register / login returns a short-lived JWT and sets a refresh cookie.
2. REST calls send `Authorization: Bearer <access>`.
3. The socket connects with `auth: { token }`. Unauthenticated sockets are dropped in middleware.
4. Access token expires → `POST /api/auth/refresh` rotates the cookie and returns a new JWT.
5. Logout deletes that refresh token server-side so it cannot be reused.

Access tokens stay in memory on the client, not `localStorage`. Reload recovers the session through the refresh cookie.

## API

| Method | Path | Auth | What it does |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | no | Create user |
| `POST` | `/api/auth/login` | no | Issue tokens |
| `POST` | `/api/auth/refresh` | cookie | Rotate refresh token |
| `POST` | `/api/auth/logout` | cookie | Revoke refresh token |
| `GET` | `/api/me` | JWT | Current user |
| `GET` | `/api/rooms` | JWT | Room list |
| `GET` | `/api/health` | no | Instance id + uptime |

Socket events: `join`, `message`, `presence`, `hello`.

## Project layout

```
src/
  index.js            boot Mongo, Redis, HTTP, sockets
  app.js              Express + static UI
  config.js
  lib/tokens.js       JWT sign/verify + refresh hashing
  lib/redis.js
  middleware/auth.js
  models/             User, Message
  routes/             auth, rooms
  sockets/index.js    Redis adapter, JWT handshake, rooms
  public/             login + chat UI
```

## What I would add next

Rate limits, user-created rooms, and a reverse proxy in front of the Node processes. I stopped there on purpose so the scaling story stays easy to demo and explain.
