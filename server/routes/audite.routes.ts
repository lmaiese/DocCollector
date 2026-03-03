import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getAuditLogs } from '../controllers/audit.controller.js';
const router = Router();
router.get('/', requireAuth, requireRole('admin'), getAuditLogs);
export default router;