import { ValidationError } from '../../errors/AppError.js';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function collect(checks) {
  const details = checks.filter(Boolean);
  if (details.length) {
    throw new ValidationError('Invalid request body', details);
  }
}

export class RegisterDto {
  constructor({ username, password }) {
    this.username = username;
    this.password = password;
  }

  static parse(body = {}) {
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');

    collect([
      USERNAME_RE.test(username)
        ? null
        : { field: 'username', message: 'Username must be 3-20 letters, numbers, or underscores' },
      password.length >= 8
        ? null
        : { field: 'password', message: 'Password must be at least 8 characters' },
    ]);

    return new RegisterDto({ username, password });
  }
}

export class LoginDto {
  constructor({ username, password }) {
    this.username = username;
    this.password = password;
  }

  static parse(body = {}) {
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');

    collect([
      username ? null : { field: 'username', message: 'Username is required' },
      password ? null : { field: 'password', message: 'Password is required' },
    ]);

    return new LoginDto({ username, password });
  }
}
