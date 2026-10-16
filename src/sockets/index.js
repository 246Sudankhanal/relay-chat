import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import config from '../config.js';
import { Message } from '../models/Message.js';
import { verifyAccessToken } from '../lib/tokens.js';

function presenceKey(room) {
  return `presence:${room}`;
}

async function membersInRoom(redis, room) {
  const raw = await redis.hGetAll(presenceKey(room));
  return Object.entries(raw).map(([userId, username]) => ({ userId, username }));
}

async function broadcastPresence(io, redis, room) {
  const members = await membersInRoom(redis, room);
  io.to(room).emit('presence', { room, members });
}

export function createSocketServer(httpServer, { pubClient, subClient }) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  // Redis adapter = Socket.IO using Redis pub/sub so every Node process
  // in the cluster receives the same emits, even if the sender is on another server.
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Unauthorized'));
    }
    try {
      const payload = verifyAccessToken(token);
      socket.user = { id: payload.sub, username: payload.username };
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.emit('hello', { instanceId: config.instanceId, user: socket.user });

    socket.on('join', async (slug, ack) => {
      try {
        const room = config.rooms.find((item) => item.slug === slug);
        if (!room) {
          ack?.({ error: 'Room not found' });
          return;
        }

        if (socket.data.room) {
          socket.leave(socket.data.room);
          await pubClient.hDel(presenceKey(socket.data.room), socket.user.id);
          await broadcastPresence(io, pubClient, socket.data.room);
        }

        socket.data.room = room.slug;
        socket.join(room.slug);
        await pubClient.hSet(presenceKey(room.slug), socket.user.id, socket.user.username);
        await broadcastPresence(io, pubClient, room.slug);

        const history = await Message.find({ room: room.slug })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

        ack?.({
          room,
          messages: history.reverse().map((msg) => ({
            id: String(msg._id),
            room: msg.room,
            userId: String(msg.userId),
            username: msg.username,
            text: msg.text,
            createdAt: msg.createdAt,
          })),
        });
      } catch (err) {
        console.error('join failed:', err);
        ack?.({ error: 'Could not join room' });
      }
    });

    socket.on('message', async (text, ack) => {
      try {
        const room = socket.data.room;
        if (!room) {
          ack?.({ error: 'Join a room first' });
          return;
        }

        const trimmed = String(text || '').trim();
        if (!trimmed || trimmed.length > 2000) {
          ack?.({ error: 'Message must be 1-2000 characters' });
          return;
        }

        const saved = await Message.create({
          room,
          userId: socket.user.id,
          username: socket.user.username,
          text: trimmed,
        });

        const payload = {
          id: String(saved._id),
          room,
          userId: socket.user.id,
          username: socket.user.username,
          text: saved.text,
          createdAt: saved.createdAt,
        };

        // io.to() is cluster-wide because of the Redis adapter.
        io.to(room).emit('message', payload);
        ack?.({ ok: true, id: payload.id });
      } catch (err) {
        console.error('message failed:', err);
        ack?.({ error: 'Could not send message' });
      }
    });

    socket.on('disconnect', async () => {
      const room = socket.data.room;
      if (!room) return;
      await pubClient.hDel(presenceKey(room), socket.user.id);
      await broadcastPresence(io, pubClient, room);
    });
  });

  return io;
}
