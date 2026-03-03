import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { getUsers, createUser, deleteUser } from '../controllers/users.controller.ts';
const router = Router();
router.get('/',       requireAuth, requireRole('admin'), getUsers);
router.post('/',      requireAuth, requireRole('admin'), createUser);
router.delete('/:id', requireAuth, requireRole('admin'), deleteUser);
export default router;