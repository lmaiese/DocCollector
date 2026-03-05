import { Router } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import {
  getRequests, createRequest, updateRequest,
  deleteRequest, reviewRequest,
} from '../controllers/requests.controller.ts';

const router = Router();
router.get('/',           requireAuth, getRequests);
router.post('/',          requireAuth, createRequest);
router.put('/:id',        requireAuth, updateRequest);
router.delete('/:id',     requireAuth, deleteRequest);
router.post('/:id/review',requireAuth, reviewRequest);   // ← Sprint 2, ma la route va preparata ora
export default router;