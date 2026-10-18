import { UnauthorizedError } from '../errors/AppError.js';
import { verifyAccessToken } from '../lib/tokens.js';

function readBearer(header = '') {
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export function requireAuth(req, _res, next) {
  try {
    const token = readBearer(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedError('Missing access token');
    }
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch (err) {
    next(err instanceof UnauthorizedError ? err : new UnauthorizedError('Invalid or expired access token'));
  }
}

export function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      throw new UnauthorizedError();
    }
    const payload = verifyAccessToken(token);
    socket.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    next(new UnauthorizedError());
  }
}
