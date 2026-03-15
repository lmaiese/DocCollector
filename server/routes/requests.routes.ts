import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import {
  getRequests, createRequest, updateRequest,
  deleteRequest, reviewRequest,
} from '../controllers/requests.controller.ts';

const router = Router();

// GET: admin, employee (non client — il portale usa /api/portal/requests)
router.get('/',            requireAuth, requireRole('admin', 'employee'), getRequests);
// POST/PUT/DELETE: solo staff
router.post('/',           requireAuth, requireRole('admin', 'employee'), createRequest);
router.put('/:id',         requireAuth, requireRole('admin', 'employee'), updateRequest);
router.delete('/:id',      requireAuth, requireRole('admin'), deleteRequest);
// Review: admin e employee possono approvare/rifiutare
router.post('/:id/review', requireAuth, requireRole('admin', 'employee'), reviewRequest);

export default router;