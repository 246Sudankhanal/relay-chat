import { AppError, ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../errors/AppError.js';
import { ApiResponse } from '../lib/ApiResponse.js';

export function notFoundHandler(req, _res, next) {
  if (!req.path.startsWith('/api')) {
    return next();
  }
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}

export function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return ApiResponse.fail(res, err);
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ApiResponse.fail(res, new ValidationError('Invalid JSON body'));
  }

  if (err.code === 11000) {
    return ApiResponse.fail(res, new ConflictError('Resource already exists'));
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return ApiResponse.fail(res, new UnauthorizedError('Invalid or expired access token'));
  }

  console.error(err);
  return ApiResponse.fail(res, new AppError('Internal server error'));
}
