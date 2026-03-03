import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getUsers, createUser, deleteUser } from '../controllers/users.controller.js';
const router = Router();
router.get('/',       requireAuth, requireRole('admin'), getUsers);
router.post('/',      requireAuth, requireRole('admin'), createUser);
router.delete('/:id', requireAuth, requireRole('admin'), deleteUser);
export default router;