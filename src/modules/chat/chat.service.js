import config from '../../config.js';
import { ValidationError } from '../../errors/AppError.js';
import { Message } from './message.model.js';

export function listRooms() {
  return config.rooms;
}

export function toPublicMessage(msg) {
  return {
    id: String(msg._id),
    room: msg.room,
    userId: String(msg.userId),
    username: msg.username,
    text: msg.text,
    createdAt: msg.createdAt,
  };
}

export async function listRecentMessages(roomSlug, limit = 50) {
  const messages = await Message.find({ room: roomSlug }).sort({ createdAt: -1 }).limit(limit).lean();
  return messages.reverse().map(toPublicMessage);
}

export async function saveMessage({ room, user, text }) {
  if (!room) {
    throw new ValidationError('Join a room first');
  }

  const saved = await Message.create({
    room,
    userId: user.id,
    username: user.username,
    text,
  });

  return toPublicMessage(saved);
}
