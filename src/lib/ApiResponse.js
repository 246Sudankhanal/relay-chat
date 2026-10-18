export class ApiResponse {
  static success(res, data, { status = 200 } = {}) {
    return res.status(status).json({ success: true, data });
  }

  static fail(res, error) {
    return res.status(error.status || 500).json({
      success: false,
      error: {
        message: error.message || 'Internal server error',
        code: error.code || 'INTERNAL_ERROR',
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }
}
