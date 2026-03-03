import { Router } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { getDashboard } from '../controllers/dashboard.controller.ts';
const router = Router();
router.get('/', requireAuth, getDashboard);
export default router;