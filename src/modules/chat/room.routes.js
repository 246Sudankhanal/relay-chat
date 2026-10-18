import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as roomController from './room.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(roomController.list));
router.get('/:slug/messages', requireAuth, asyncHandler(roomController.messages));

export default router;
