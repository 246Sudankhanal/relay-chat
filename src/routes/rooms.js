import { Router } from 'express';
import config from '../config.js';
import { Message } from '../models/Message.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, (_req, res) => {
  res.json({ rooms: config.rooms });
});

router.get('/:slug/messages', requireAuth, async (req, res) => {
  const room = config.rooms.find((item) => item.slug === req.params.slug);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const messages = await Message.find({ room: room.slug })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return res.json({
    messages: messages.reverse().map((msg) => ({
      id: String(msg._id),
      room: msg.room,
      userId: String(msg.userId),
      username: msg.username,
      text: msg.text,
      createdAt: msg.createdAt,
    })),
  });
});

export default router;
