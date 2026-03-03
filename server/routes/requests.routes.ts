import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getRequests, createRequest, updateRequest, deleteRequest } from '../controllers/requests.controller.js';
const router = Router();
router.get('/',       requireAuth, getRequests);
router.post('/',      requireAuth, createRequest);
router.put('/:id',    requireAuth, updateRequest);
router.delete('/:id', requireAuth, deleteRequest);
export default router;