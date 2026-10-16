import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import {
  signAccessToken,
  createRefreshToken,
  hashToken,
  refreshExpiryDate,
  refreshCookieOptions,
} from '../lib/tokens.js';

const router = Router();
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', { ...refreshCookieOptions(), maxAge: 0 });
}

function pruneExpiredTokens(user) {
  const now = Date.now();
  user.refreshTokens = user.refreshTokens.filter((entry) => entry.expiresAt.getTime() > now);
}

router.post('/register', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 letters, numbers, or underscores' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = await User.findOne({ username });
  if (existing) {
    return res.status(409).json({ error: 'Username is already taken' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const refreshToken = createRefreshToken();
  const user = await User.create({
    username,
    passwordHash,
    refreshTokens: [{ tokenHash: hashToken(refreshToken), expiresAt: refreshExpiryDate() }],
  });

  setRefreshCookie(res, refreshToken);
  return res.status(201).json({
    accessToken: signAccessToken(user),
    user: user.toPublic(),
  });
});

router.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  pruneExpiredTokens(user);
  const refreshToken = createRefreshToken();
  user.refreshTokens.push({
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiryDate(),
  });
  await user.save();

  setRefreshCookie(res, refreshToken);
  return res.json({
    accessToken: signAccessToken(user),
    user: user.toPublic(),
  });
});

router.post('/refresh', async (req, res) => {
  const incoming = req.cookies.refreshToken;
  if (!incoming) {
    return res.status(401).json({ error: 'Missing refresh token' });
  }

  const tokenHash = hashToken(incoming);
  const user = await User.findOne({ 'refreshTokens.tokenHash': tokenHash });
  if (!user) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: 'Refresh token is invalid' });
  }

  const stored = user.refreshTokens.find((entry) => entry.tokenHash === tokenHash);
  if (!stored || stored.expiresAt.getTime() <= Date.now()) {
    user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash !== tokenHash);
    await user.save();
    clearRefreshCookie(res);
    return res.status(401).json({ error: 'Refresh token has expired' });
  }

  // Rotate: drop the used token, issue a new one so stolen tokens cannot be reused.
  const nextRefresh = createRefreshToken();
  user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash !== tokenHash);
  pruneExpiredTokens(user);
  user.refreshTokens.push({
    tokenHash: hashToken(nextRefresh),
    expiresAt: refreshExpiryDate(),
  });
  await user.save();

  setRefreshCookie(res, nextRefresh);
  return res.json({
    accessToken: signAccessToken(user),
    user: user.toPublic(),
  });
});

router.post('/logout', async (req, res) => {
  const incoming = req.cookies.refreshToken;
  if (incoming) {
    const tokenHash = hashToken(incoming);
    await User.updateOne(
      { 'refreshTokens.tokenHash': tokenHash },
      { $pull: { refreshTokens: { tokenHash } } }
    );
  }
  clearRefreshCookie(res);
  return res.json({ ok: true });
});

export default router;
