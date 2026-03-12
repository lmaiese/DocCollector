import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import {
  getPortalDashboard,
  getPortalRequests,
  getPortalDocuments,
  downloadPortalDocument,  
  uploadPortalDocument,
  getPortalPractices,
  addPortalComment,
} from '../controllers/portal.controller.ts';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const router = Router();

// Tutte le route del portale richiedono ruolo 'client'
router.use(requireAuth, requireRole('client'));

router.get('/dashboard',          getPortalDashboard);
router.get('/requests',           getPortalRequests);
router.get('/documents',          getPortalDocuments);
router.get('/documents/:id/download', downloadPortalDocument);
router.get('/practices',          getPortalPractices);
router.post('/requests/:id/upload', upload.single('file'), uploadPortalDocument);
router.post('/requests/:id/comments', addPortalComment);

export default router;
