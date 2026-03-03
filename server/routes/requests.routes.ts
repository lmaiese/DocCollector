import { Router } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { getRequests, createRequest, updateRequest, deleteRequest } from '../controllers/requests.controller.ts';
const router = Router();
router.get('/',       requireAuth, getRequests);
router.post('/',      requireAuth, createRequest);
router.put('/:id',    requireAuth, updateRequest);
router.delete('/:id', requireAuth, deleteRequest);
export default router;