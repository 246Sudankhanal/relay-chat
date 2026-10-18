# Relay

Realtime chat across multiple Node processes. Clients authenticate with JWT; Socket.IO uses Redis pub/sub so every instance shares rooms, messages, and presence.

```
Browser ── JWT ──► Express REST
Browser ── JWT ──► Socket.IO ── Redis adapter ──► other Node processes
                         │
                         ├── Redis (online members)
                         └── MongoDB (users, messages)
```

## Features

- Register / login with short-lived access tokens and rotating refresh tokens (httpOnly cookie, hashed in MongoDB)
- Socket.IO handshake checks the same JWT; display names come from the token, not the client payload
- Rooms, message history, and cluster-wide presence via Redis
- Domain modules (`auth`, `chat`, `system`): route → controller → service → model
- Typed `AppError`s, DTOs, and a single Express error handler

## Stack

Node.js, Express, Socket.IO, Redis (`@socket.io/redis-adapter`), MongoDB (Mongoose), JWT (`jsonwebtoken` + `bcryptjs`)

## Setup

Node 18+ and Redis + MongoDB (Docker or local).

```bash
cp .env.example .env
pnpm docker:up          # Mongo + Redis
pnpm install
pnpm start              # http://127.0.0.1:3000
```

Create an account, join a room, send messages.

### Multiple instances

```bash
pnpm start:a            # :3000  INSTANCE_ID=server-a
pnpm start:b            # :3001  INSTANCE_ID=server-b
pnpm scale-check        # Alice on :3000, Bob on :3001
```

The sidebar badge shows which process handled the socket. Messages still appear on both because Redis is the bus.

## Auth

1. Register / login returns an access JWT and sets a refresh cookie.
2. REST calls send `Authorization: Bearer <access>`.
3. The socket connects with `auth: { token }`. Unauthenticated sockets are rejected.
4. `POST /api/auth/refresh` rotates the refresh token and issues a new access JWT.
5. Logout deletes that refresh token on the server.

The client keeps the access token in memory. A reload recovers the session through the refresh cookie.

## API

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | — | Create user |
| `POST` | `/api/auth/login` | — | Issue tokens |
| `POST` | `/api/auth/refresh` | cookie | Rotate refresh token |
| `POST` | `/api/auth/logout` | cookie | Revoke refresh token |
| `GET` | `/api/me` | JWT | Current user |
| `GET` | `/api/rooms` | JWT | Room list |
| `GET` | `/api/rooms/:slug/messages` | JWT | Recent messages |
| `GET` | `/api/health` | — | Instance id and uptime |

Socket events: `hello`, `join`, `message`, `presence`.

Responses use `{ success, data }` or `{ success, error: { message, code, details } }`.

## Layout

```
src/
  public/                 chat UI
  modules/auth/           user model, DTOs, service, controller, routes
  modules/chat/           messages, rooms, presence, sockets controller
  modules/system/         health, /me
  errors/                 AppError
  middleware/             JWT, asyncHandler, errorHandler
  lib/                    tokens, ApiResponse, Redis
  sockets/                Socket.IO adapter wiring
```
