import { ApiResponse } from '../../lib/ApiResponse.js';
import { refreshCookieOptions } from '../../lib/tokens.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import * as authService from './auth.service.js';

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', { ...refreshCookieOptions(), maxAge: 0 });
}

function sendSession(res, session, status = 200) {
  setRefreshCookie(res, session.refreshToken);
  ApiResponse.success(res, { accessToken: session.accessToken, user: session.user }, { status });
}

export async function register(req, res) {
  const dto = RegisterDto.parse(req.body);
  sendSession(res, await authService.register(dto), 201);
}

export async function login(req, res) {
  const dto = LoginDto.parse(req.body);
  sendSession(res, await authService.login(dto));
}

export async function refresh(req, res) {
  try {
    sendSession(res, await authService.rotateRefreshToken(req.cookies.refreshToken));
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
}

export async function logout(req, res) {
  await authService.logout(req.cookies.refreshToken);
  clearRefreshCookie(res);
  ApiResponse.success(res, { ok: true });
}
