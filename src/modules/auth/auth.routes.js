import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));

export default router;
