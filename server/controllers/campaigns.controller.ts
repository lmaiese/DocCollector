// server/controllers/campaigns.controller.ts
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, inArray } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.pg.ts';
import {
  requests, clients, documentTypes, clientTokens,
  tenants, users, requestTemplates,
} from '../../src/db/schema.pg.ts';
import { logAudit } from '../services/audit.service.ts';
import { emailService } from '../services/email/email.service.ts';
import { templates } from '../services/email/templates.ts';

interface CampaignItem {
  doc_type_code: string;
  deadline?: string | null;
  notes?: string | null;
}

/**
 * POST /api/campaigns
 * Crea richieste in blocco per una lista di clienti.
 * Body: { client_ids: string[], items: CampaignItem[], period: string, practice_id?: string }
 */
export const createCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  const { client_ids, items, period, practice_id } = req.body as {
    client_ids: string[];
    items: CampaignItem[];
    period: string;
    practice_id?: string;
  };

  if (!client_ids?.length) {
    res.status(400).json({ error: 'client_ids è obbligatorio e non può essere vuoto' }); return;
  }
  if (!items?.length) {
    res.status(400).json({ error: 'items è obbligatorio e non può essere vuoto' }); return;
  }
  if (!period || !/^\d{6}$/.test(period)) {
    res.status(400).json({ error: 'period deve essere in formato YYYYMM' }); return;
  }

  // Verifica che tutti i clienti appartengano al tenant
  const validClients = await db.query.clients.findMany({
    where: and(
      eq(clients.tenantId, req.user.tenantId),
      inArray(clients.id, client_ids),
    ),
  });

  if (validClients.length !== client_ids.length) {
    res.status(400).json({ error: 'Uno o più clienti non trovati o non appartenenti al tenant' }); return;
  }

  const campaignId = uuidv4();
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, req.user.tenantId) });

  const createdRequests: any[] = [];
  const errors: string[] = [];

  for (const client of validClients) {
    for (const item of items) {
      try {
        const docType = await db.query.documentTypes.findFirst({
          where: eq(documentTypes.code, item.doc_type_code),
        });

        const [request] = await db.insert(requests).values({
          tenantId:    req.user.tenantId,
          clientId:    client.id,
          practiceId:  practice_id || null,
          docTypeCode: item.doc_type_code,
          period,
          deadline:    item.deadline || null,
          notes:       item.notes    || null,
          campaignId,
          createdBy:   req.user.id,
        }).returning();

        createdRequests.push(request);

        // Email al cliente
        const clientUser = await db.query.users.findFirst({
          where: and(
            eq(users.clientId, client.id),
            eq(users.tenantId, req.user.tenantId),
          ),
        });

        const emailTo = clientUser?.email || client.email;
        if (emailTo) {
          let portalUrl = `${process.env.APP_URL}/portale`;
          if (clientUser) {
            const token     = uuidv4();
            const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
            await db.insert(clientTokens).values({
              tenantId: req.user.tenantId, userId: clientUser.id, token, expiresAt,
            });
            portalUrl = `${process.env.APP_URL}/portale/accesso?token=${token}&next=/portale/richieste`;
          }

          const tpl = templates.requestCreated(
            {
              name:           tenant?.name || 'Lo Studio',
              primaryColor:   tenant?.primaryColor || '#4f46e5',
              logoUrl:        tenant?.logoUrl,
              emailSignature: tenant?.emailSignature,
            },
            {
              clientName:   client.name,
              docTypeLabel: docType?.label || item.doc_type_code,
              period,
              deadline:     item.deadline,
              notes:        item.notes,
              portalUrl,
            },
          );

          await emailService.queue({
            tenantId: req.user.tenantId,
            toEmail:  emailTo,
            subject:  tpl.subject,
            bodyHtml: tpl.bodyHtml,
            type:     'request_created',
            refType:  'request',
            refId:    request.id,
          });
        }
      } catch (err: any) {
        errors.push(`${client.name} / ${item.doc_type_code}: ${err.message}`);
      }
    }
  }

  await logAudit(
    req.user.tenantId,
    req.user.id,
    'CREATE_CAMPAIGN',
    `Campagna ${campaignId}: ${createdRequests.length} richieste create per ${validClients.length} clienti`,
  );

  res.status(201).json({
    campaignId,
    created:  createdRequests.length,
    errors:   errors.length > 0 ? errors : undefined,
    requests: createdRequests,
  });
};

/**
 * POST /api/campaigns/from-template
 * Crea una campagna a partire da un template di sistema o custom.
 */
export const createCampaignFromTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  const { template_id, client_ids, period, base_deadline } = req.body as {
    template_id: string;
    client_ids:  string[];
    period:      string;
    base_deadline?: string;
  };

  if (!template_id || !client_ids?.length || !period) {
    res.status(400).json({ error: 'template_id, client_ids e period sono obbligatori' }); return;
  }

  const template = await db.query.requestTemplates.findFirst({
    where: eq(requestTemplates.id, template_id),
  });
  if (!template || !template.isActive) {
    res.status(404).json({ error: 'Template non trovato o non attivo' }); return;
  }

  const rawItems = template.items as Array<{ docTypeCode: string; deadlineDaysOffset?: number }>;

  const items: CampaignItem[] = rawItems.map(i => {
    let deadline: string | null = null;
    if (base_deadline && i.deadlineDaysOffset) {
      const d = new Date(base_deadline);
      d.setDate(d.getDate() + i.deadlineDaysOffset);
      deadline = d.toISOString().split('T')[0];
    } else if (base_deadline) {
      deadline = base_deadline;
    }
    return { doc_type_code: i.docTypeCode, deadline };
  });

  // Riusa la logica di createCampaign passando i dati normalizzati
  req.body = { client_ids, items, period };
  return createCampaign(req, res);
};

/**
 * GET /api/campaigns
 * Lista campagne del tenant (aggregate per campaignId).
 */
export const getCampaigns = async (req: AuthRequest, res: Response): Promise<void> => {
  const rows = await db.execute(`
    SELECT
      campaign_id,
      COUNT(*)::int                                          AS total_requests,
      COUNT(*) FILTER (WHERE status = 'approved')::int      AS approved,
      COUNT(*) FILTER (WHERE status = 'pending')::int       AS pending,
      COUNT(*) FILTER (WHERE status = 'rejected')::int      AS rejected,
      MIN(created_at)                                        AS created_at,
      MAX(deadline)                                          AS latest_deadline,
      COUNT(DISTINCT client_id)::int                        AS client_count
    FROM requests
    WHERE tenant_id = $1 AND campaign_id IS NOT NULL
    GROUP BY campaign_id
    ORDER BY created_at DESC
    LIMIT 50
  `, [req.user.tenantId]);

  res.json(rows.rows);
};