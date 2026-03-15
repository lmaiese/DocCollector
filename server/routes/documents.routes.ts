// server/routes/documents.routes.ts
import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import {
  uploadDocument,
  uploadDocumentToClient,
  downloadDocument,
  deleteDocument,
} from '../controllers/documents.controller.ts';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const router = Router();

router.post('/upload',            requireAuth, upload.single('file'), uploadDocument);
router.post('/upload-to-client',  requireAuth, requireRole('admin', 'employee'), upload.single('file'), uploadDocumentToClient);
router.get('/:id/download',       requireAuth, downloadDocument);
router.delete('/:id',             requireAuth, deleteDocument);

export default router;