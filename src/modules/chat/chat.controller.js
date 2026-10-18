import config from '../../config.js';
import { CreateMessageDto, RoomSlugDto } from './chat.dto.js';
import * as chatService from './chat.service.js';
import * as presenceService from './presence.service.js';

export function createChatController({ io, redis }) {
  async function emitPresence(room) {
    io.to(room).emit('presence', {
      room,
      members: await presenceService.listMembers(redis, room),
    });
  }

  return {
    hello() {
      return { instanceId: config.instanceId };
    },

    async join(socket, slug) {
      const { room } = RoomSlugDto.parse(slug);

      if (socket.data.room) {
        socket.leave(socket.data.room);
        await presenceService.removeMember(redis, socket.data.room, socket.user.id);
        await emitPresence(socket.data.room);
      }

      socket.data.room = room.slug;
      socket.join(room.slug);
      await presenceService.addMember(redis, room.slug, socket.user);
      await emitPresence(room.slug);

      return {
        room,
        messages: await chatService.listRecentMessages(room.slug),
      };
    },

    async message(socket, text) {
      const dto = CreateMessageDto.parse(text);
      const payload = await chatService.saveMessage({
        room: socket.data.room,
        user: socket.user,
        text: dto.text,
      });
      io.to(payload.room).emit('message', payload);
      return { id: payload.id };
    },

    async disconnect(socket) {
      const room = socket.data.room;
      if (!room) return;
      await presenceService.removeMember(redis, room, socket.user.id);
      await emitPresence(room);
    },
  };
}
