import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { getAuditLogs } from '../controllers/audit.controller.ts';
const router = Router();
router.get('/', requireAuth, requireRole('admin'), getAuditLogs);
export default router;