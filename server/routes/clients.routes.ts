import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { getClients, createClient, updateClient, deleteClient } from '../controllers/clients.controller.ts';
const router = Router();
router.get('/',     requireAuth, getClients);
router.post('/',    requireAuth, requireRole('admin','employee'), createClient);
router.put('/:id',  requireAuth, requireRole('admin'), updateClient);
router.delete('/:id', requireAuth, requireRole('admin'), deleteClient);
export default router;