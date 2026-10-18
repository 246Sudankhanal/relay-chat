import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import roomRoutes from './chat/room.routes.js';
import systemRoutes from './system/system.routes.js';

const router = Router();

router.use(systemRoutes);
router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);

export default router;
