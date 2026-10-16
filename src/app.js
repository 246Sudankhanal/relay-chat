import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './config.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import { requireAuth } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    instanceId: config.instanceId,
    uptime: process.uptime(),
  });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user, instanceId: config.instanceId });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
