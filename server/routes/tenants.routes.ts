import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import {
  getTenants, createTenant, updateTenant, getMyTenant,
} from '../controllers/tenants.controller.ts';

const router = Router();

// Superadmin: lista tutti i tenant
router.get('/',        requireAuth, requireRole('superadmin'), getTenants);
router.post('/',       requireAuth, requireRole('superadmin'), createTenant);

// Admin: legge e aggiorna il proprio tenant
router.get('/me',      requireAuth, requireRole('admin', 'employee'), getMyTenant);
router.put('/me',      requireAuth, requireRole('admin'), (req, res) => {
  req.params.id = req.user.tenantId;
  return updateTenant(req as any, res);
});

// Superadmin: aggiorna qualsiasi tenant
router.put('/:id',     requireAuth, requireRole('superadmin', 'admin'), updateTenant);

export default router;