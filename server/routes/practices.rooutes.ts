import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import {
  getPractices, getPractice, createPractice,
  updatePractice, deletePractice,
} from '../controllers/practices.controller.ts';

const router = Router();
router.get('/',        requireAuth, getPractices);
router.get('/:id',     requireAuth, getPractice);
router.post('/',       requireAuth, requireRole('admin', 'employee'), createPractice);
router.put('/:id',     requireAuth, requireRole('admin', 'employee'), updatePractice);
router.delete('/:id',  requireAuth, requireRole('admin'), deletePractice);
export default router;