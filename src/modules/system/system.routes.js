import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as systemController from './system.controller.js';

const router = Router();

router.get('/health', asyncHandler(systemController.health));
router.get('/me', requireAuth, asyncHandler(systemController.me));

export default router;
