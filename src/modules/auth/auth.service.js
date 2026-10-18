import bcrypt from 'bcryptjs';
import { ConflictError, UnauthorizedError } from '../../errors/AppError.js';
import {
  signAccessToken,
  createRefreshToken,
  hashToken,
  refreshExpiryDate,
} from '../../lib/tokens.js';
import { User } from './user.model.js';

function pruneExpiredTokens(user) {
  const now = Date.now();
  user.refreshTokens = user.refreshTokens.filter((entry) => entry.expiresAt.getTime() > now);
}

async function attachRefreshToken(user) {
  pruneExpiredTokens(user);
  const refreshToken = createRefreshToken();
  user.refreshTokens.push({
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiryDate(),
  });
  await user.save();
  return {
    accessToken: signAccessToken(user),
    refreshToken,
    user: user.toPublic(),
  };
}

export async function register({ username, password }) {
  const existing = await User.findOne({ username });
  if (existing) {
    throw new ConflictError('Username is already taken');
  }

  const user = await User.create({
    username,
    passwordHash: await bcrypt.hash(password, 10),
    refreshTokens: [],
  });

  return attachRefreshToken(user);
}

export async function login({ username, password }) {
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid username or password');
  }
  return attachRefreshToken(user);
}

export async function rotateRefreshToken(incoming) {
  if (!incoming) {
    throw new UnauthorizedError('Missing refresh token');
  }

  const tokenHash = hashToken(incoming);
  const user = await User.findOne({ 'refreshTokens.tokenHash': tokenHash });
  if (!user) {
    throw new UnauthorizedError('Refresh token is invalid');
  }

  const stored = user.refreshTokens.find((entry) => entry.tokenHash === tokenHash);
  if (!stored || stored.expiresAt.getTime() <= Date.now()) {
    user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash !== tokenHash);
    await user.save();
    throw new UnauthorizedError('Refresh token has expired');
  }

  user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash !== tokenHash);
  return attachRefreshToken(user);
}

export async function logout(incoming) {
  if (!incoming) return;
  const tokenHash = hashToken(incoming);
  await User.updateOne(
    { 'refreshTokens.tokenHash': tokenHash },
    { $pull: { refreshTokens: { tokenHash } } }
  );
}
