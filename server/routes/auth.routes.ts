import { Router } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { googleLogin, registerTenant, getMe } from '../controllers/auth.controller.ts';
const router = Router();
router.post('/google', googleLogin);
router.post('/register-tenant', registerTenant);
router.get('/me', requireAuth, getMe);
export default router;