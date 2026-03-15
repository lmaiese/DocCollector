// server/routes/campaigns.routes.ts
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import {
  createCampaign,
  createCampaignFromTemplate,
  getCampaigns,
} from '../controllers/campaigns.controller.ts';

const router = Router();

router.get('/',               requireAuth, requireRole('admin', 'employee'), getCampaigns);
router.post('/',              requireAuth, requireRole('admin', 'employee'), createCampaign);
router.post('/from-template', requireAuth, requireRole('admin', 'employee'), createCampaignFromTemplate);

export default router;