import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getTenants, createTenant } from '../controllers/tenants.controller.js';
const router = Router();
router.get('/',  requireAuth, requireRole('superadmin'), getTenants);
router.post('/', requireAuth, requireRole('superadmin'), createTenant);
export default router;