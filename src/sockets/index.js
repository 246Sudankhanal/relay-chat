import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createChatController } from '../modules/chat/chat.controller.js';
import { AppError } from '../errors/AppError.js';
import { authenticateSocket } from '../middleware/auth.js';

function toAckError(err) {
  const appErr = err instanceof AppError ? err : new AppError('Internal server error');
  if (!(err instanceof AppError)) {
    console.error(err);
  }
  return {
    success: false,
    error: { message: appErr.message, code: appErr.code },
  };
}

function onAsync(socket, event, handler) {
  socket.on(event, (...args) => {
    const ack = typeof args.at(-1) === 'function' ? args.pop() : undefined;
    Promise.resolve(handler(...args))
      .then((data) => ack?.({ success: true, data }))
      .catch((err) => ack?.(toAckError(err)));
  });
}

export function createSocketServer(httpServer, { pubClient, subClient }) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.adapter(createAdapter(pubClient, subClient));
  io.use(authenticateSocket);

  const chatController = createChatController({ io, redis: pubClient });

  io.on('connection', (socket) => {
    socket.emit('hello', { ...chatController.hello(), user: socket.user });
    onAsync(socket, 'join', (slug) => chatController.join(socket, slug));
    onAsync(socket, 'message', (text) => chatController.message(socket, text));
    socket.on('disconnect', () => {
      chatController.disconnect(socket).catch((err) => console.error(err));
    });
  });

  return io;
}
