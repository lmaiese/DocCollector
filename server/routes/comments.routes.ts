import { Router } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { getComments, addComment } from '../controllers/comments.controller.ts';

const router = Router({ mergeParams: true });
router.get('/',  requireAuth, getComments);
router.post('/', requireAuth, addComment);
export default router;