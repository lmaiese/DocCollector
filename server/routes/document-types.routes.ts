import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import {
  getDocumentTypes, createDocumentType, deleteDocumentType,
} from '../controllers/document-types.controller.ts';

const router = Router();
router.get('/',       requireAuth, getDocumentTypes);
router.post('/',      requireAuth, requireRole('admin'), createDocumentType);
router.delete('/:id', requireAuth, requireRole('admin'), deleteDocumentType);
export default router;
