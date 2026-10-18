import config from '../../config.js';
import { ApiResponse } from '../../lib/ApiResponse.js';

export async function health(_req, res) {
  ApiResponse.success(res, {
    instanceId: config.instanceId,
    uptime: process.uptime(),
  });
}

export async function me(req, res) {
  ApiResponse.success(res, { user: req.user, instanceId: config.instanceId });
}
