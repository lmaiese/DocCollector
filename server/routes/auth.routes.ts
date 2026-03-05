import { Router } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import {
  googleLogin, registerTenant, getMe,
  requestMagicLink, verifyMagicLink,
} from '../controllers/auth.controller.ts';

const router = Router();
router.post('/google',        googleLogin);
router.post('/register-tenant', registerTenant);
router.get('/me',             requireAuth, getMe);
router.post('/magic-link',    requestMagicLink);   // POST {email} → invia email con link
router.get('/verify-token',   verifyMagicLink);    // GET ?token=xxx → sessione + redirect
export default router;