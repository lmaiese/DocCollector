import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc, ilike, or, isNull } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.pg.ts';
import {
  requests, clients, documents, users,
  tenants, documentTypes, clientTokens, practices,
} from '../../src/db/schema.pg.ts';
import { logAudit } from '../services/audit.service.ts';
import { emailService } from '../services/email/email.service.ts';
import { templates } from '../services/email/templates.ts';

export const getRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, client_id, period, search } = req.query;
  const conditions: any[] = [eq(requests.tenantId, req.user.tenantId)];
  if (status)    conditions.push(eq(requests.status, status as any));
  if (client_id) conditions.push(eq(requests.clientId, client_id as string));
  if (period)    conditions.push(ilike(requests.period, `%${period}%`));

  const rows = await db
    .select({
      id: requests.id, docTypeCode: requests.docTypeCode,
      period: requests.period, status: requests.status,
      deadline: requests.deadline, notes: requests.notes,
      rejectionReason: requests.rejectionReason,
      practiceId: requests.practiceId, campaignId: requests.campaignId,
      createdAt: requests.createdAt, updatedAt: requests.updatedAt,
      clientId: requests.clientId, clientName: clients.name,
      docTypeLabel: documentTypes.label,
      documentId: documents.id, documentFilename: documents.originalFilename,
    })
    .from(requests)
    .innerJoin(clients, eq(clients.id, requests.clientId))
    .leftJoin(documentTypes,
  and(
    eq(documentTypes.code, requests.docTypeCode),
    or(
      isNull(documentTypes.tenantId),
      eq(documentTypes.tenantId, req.user.tenantId),
    )
  )
)
    .leftJoin(documents, eq(documents.requestId, requests.id))
    .where(and(...conditions))
    .orderBy(desc(requests.createdAt));

  res.json(rows);
};

// Dentro server/controllers/requests.controller.ts
// Sostituisci solo la funzione createRequest

export const createRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { client_id, period, doc_type_code, deadline, notes, practice_id } = req.body;
  if (!client_id || !period || !doc_type_code) {
    res.status(400).json({ error: 'client_id, period e doc_type_code sono richiesti' }); return;
  }
  if (!/^\d{6}$/.test(period)) {
    res.status(400).json({ error: 'Period deve essere in formato YYYYMM' }); return;
  }

  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, client_id), eq(clients.tenantId, req.user.tenantId)),
  });
  if (!client) { res.status(404).json({ error: 'Cliente non trovato' }); return; }

  const docType = await db.query.documentTypes.findFirst({
    where: eq(documentTypes.code, doc_type_code),
  });

  const [request] = await db.insert(requests).values({
    tenantId: req.user.tenantId, clientId: client_id,
    practiceId: practice_id || null, docTypeCode: doc_type_code,
    period, deadline: deadline || null, notes: notes || null,
    createdBy: req.user.id,
  }).returning();

  await logAudit(req.user.tenantId, req.user.id, 'CREATE_REQUEST',
    `${doc_type_code} per ${client.name} periodo ${period}`);

  // FIX: determina email destinatario con priorità corretta
  // 1) utente cliente registrato, 2) email anagrafica cliente
  const clientUser = await db.query.users.findFirst({
    where: and(
      eq(users.clientId, client_id),
      eq(users.tenantId, req.user.tenantId),
    ),
  });

  const emailTo = clientUser?.email || client.email;

  if (emailTo) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, req.user.tenantId),
    });

    // Genera magic link solo se c'è un utente cliente registrato
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
      { name: tenant?.name || 'Lo Studio', primaryColor: tenant?.primaryColor || '#4f46e5',
        logoUrl: tenant?.logoUrl, emailSignature: tenant?.emailSignature },
      { clientName: client.name, docTypeLabel: docType?.label || doc_type_code,
        period, deadline, notes, portalUrl },
    );

    await emailService.queue({
      tenantId: req.user.tenantId, toEmail: emailTo,
      subject: tpl.subject, bodyHtml: tpl.bodyHtml,
      type: 'request_created', refType: 'request', refId: request.id,
    });
  }

  res.status(201).json(request);
};

export const updateRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const existing = await db.query.requests.findFirst({
    where: and(eq(requests.id, id), eq(requests.tenantId, req.user.tenantId)),
  });
  if (!existing) { res.status(404).json({ error: 'Richiesta non trovata' }); return; }
  const { deadline, notes } = req.body;
  await db.update(requests)
    .set({ deadline: deadline || null, notes: notes || null, updatedAt: new Date() })
    .where(eq(requests.id, id));
  res.json({ success: true });
};

export const deleteRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const request = await db.query.requests.findFirst({
    where: and(eq(requests.id, id), eq(requests.tenantId, req.user.tenantId)),
  });
  if (!request) { res.status(404).json({ error: 'Richiesta non trovata' }); return; }
  if (['uploaded','under_review'].includes(request.status)) {
    res.status(400).json({ error: 'Elimina prima il documento' }); return;
  }
  await db.delete(requests).where(eq(requests.id, id));
  await logAudit(req.user.tenantId, req.user.id, 'DELETE_REQUEST', `Eliminata ${id}`);
  res.json({ success: true });
};

export const reviewRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { action, rejection_reason } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    res.status(400).json({ error: 'action deve essere approve o reject' }); return;
  }
  if (action === 'reject' && !rejection_reason?.trim()) {
    res.status(400).json({ error: 'rejection_reason obbligatorio per il rifiuto' }); return;
  }

  const request = await db.query.requests.findFirst({
    where: and(eq(requests.id, id), eq(requests.tenantId, req.user.tenantId)),
  });
  if (!request) { res.status(404).json({ error: 'Richiesta non trovata' }); return; }
  if (!['uploaded', 'under_review'].includes(request.status)) {
    res.status(400).json({ error: `Impossibile revisionare una richiesta in stato "${request.status}"` }); return;
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  await db.update(requests).set({
    status:          newStatus,
    reviewedBy:      req.user.id,
    reviewedAt:      new Date(),
    rejectionReason: action === 'reject' ? rejection_reason.trim() : null,
    updatedAt:       new Date(),
  }).where(eq(requests.id, id));

  // Recupera dati per notifica
  const client  = await db.query.clients.findFirst({ where: eq(clients.id, request.clientId) });
  const tenant  = await db.query.tenants.findFirst({ where: eq(tenants.id, req.user.tenantId) });
  const docType = await db.query.documentTypes.findFirst({
    where: eq(documentTypes.code, request.docTypeCode),
  });
  const clientUser = await db.query.users.findFirst({
    where: and(eq(users.clientId, request.clientId), eq(users.tenantId, req.user.tenantId)),
  });

  const branding = {
    name:           tenant?.name || 'Lo Studio',
    primaryColor:   tenant?.primaryColor || '#4f46e5',
    logoUrl:        tenant?.logoUrl,
    emailSignature: tenant?.emailSignature,
  };
  const portalUrl = `${process.env.APP_URL}/portale/richieste`;
  const emailTo   = clientUser?.email || client?.email;

  if (emailTo) {
    if (action === 'approve') {
      const tpl = templates.documentApproved(branding, {
        clientName:   client?.name || emailTo,
        docTypeLabel: docType?.label || request.docTypeCode,
        portalUrl,
      });
      await emailService.queue({
        tenantId: req.user.tenantId, toEmail: emailTo,
        subject: tpl.subject, bodyHtml: tpl.bodyHtml,
        type: 'document_approved', refType: 'request', refId: id,
      });
    } else {
      const tpl = templates.documentRejected(branding, {
        clientName:   client?.name || emailTo,
        docTypeLabel: docType?.label || request.docTypeCode,
        reason:       rejection_reason.trim(),
        portalUrl,
      });
      await emailService.queue({
        tenantId: req.user.tenantId, toEmail: emailTo,
        subject: tpl.subject, bodyHtml: tpl.bodyHtml,
        type: 'document_rejected', refType: 'request', refId: id,
      });
    }
  }

  // Aggiorna stato pratica se collegata
  if (request.practiceId) {
    await recalcPracticeStatus(request.practiceId);
  }

  await logAudit(req.user.tenantId, req.user.id, `REQUEST_${newStatus.toUpperCase()}`,
    `Richiesta ${id} — ${docType?.label || request.docTypeCode}`);

  res.json({ success: true, newStatus });
};

// Ricalcola lo stato aggregato di una pratica in base alle richieste figlie
async function recalcPracticeStatus(practiceId: string): Promise<void> {
  const reqs = await db.query.requests.findMany({
    where: eq(requests.practiceId, practiceId),
  });
  if (reqs.length === 0) return;

  const allApproved  = reqs.every(r => r.status === 'approved');
  const anyPending   = reqs.some(r => r.status === 'pending');
  const anyUploaded  = reqs.some(r => ['uploaded', 'under_review'].includes(r.status));

  let newStatus: 'open' | 'in_progress' | 'completed' =
    allApproved  ? 'completed'   :
    anyUploaded  ? 'in_progress' : 'open';

  await db.update(practices)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(practices.id, practiceId));
}