import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/users.controller.ts';

const router = Router();

// Solo admin dello studio può gestire utenti
router.get('/',        requireAuth, requireRole('admin', 'superadmin'), getUsers);
router.post('/',       requireAuth, requireRole('admin'), createUser);
router.patch('/:id',   requireAuth, requireRole('admin'), updateUser);
router.delete('/:id',  requireAuth, requireRole('admin'), deleteUser);

export default router;