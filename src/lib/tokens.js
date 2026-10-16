import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import config from '../config.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), username: user.username },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshExpiryDate() {
  const expires = new Date();
  expires.setDate(expires.getDate() + config.refreshTokenDays);
  return expires;
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: config.refreshTokenDays * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  };
}
