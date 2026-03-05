import { Response } from 'express';
import { eq, and, desc, or } from 'drizzle-orm';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.pg.ts';
import {
  requests, documents, practices, requestComments,
  users, clients, tenants, documentTypes, notifications,
} from '../../src/db/schema.pg.ts';
import { createStorageService } from '../services/storage/factory.ts';
import { logAudit } from '../services/audit.service.ts';
import { emailService } from '../services/email/email.service.ts';
import { templates } from '../services/email/templates.ts';

async function getStorage(tenantId: string) {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { storageProvider: true, storageConfig: true },
  });
  return createStorageService(
    tenant?.storageProvider || 'local',
    JSON.stringify(tenant?.storageConfig || {}),
  );
}

// ─── Dashboard cliente ─────────────────────────────────────────────────────
export const getPortalDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const clientId = req.user.clientId;
  if (!clientId) { res.status(403).json({ error: 'Nessun cliente associato' }); return; }

  const [pending, uploaded, underReview, approved] = await Promise.all([
    db.select().from(requests)
      .where(and(eq(requests.clientId, clientId), eq(requests.status, 'pending'))),
    db.select().from(requests)
      .where(and(eq(requests.clientId, clientId), eq(requests.status, 'uploaded'))),
    db.select().from(requests)
      .where(and(eq(requests.clientId, clientId), eq(requests.status, 'under_review'))),
    db.select().from(requests)
      .where(and(eq(requests.clientId, clientId), eq(requests.status, 'approved'))),
  ]);

  // Scadenze imminenti (7 giorni)
  const today    = new Date();
  const in7days  = new Date(today); in7days.setDate(today.getDate() + 7);
  const todayStr = today.toISOString().split('T')[0];
  const in7Str   = in7days.toISOString().split('T')[0];

  const expiring = pending.filter(r =>
    r.deadline && r.deadline >= todayStr && r.deadline <= in7Str
  );
  const overdue = pending.filter(r =>
    r.deadline && r.deadline < todayStr
  );

  res.json({
    stats: {
      pending:     pending.length,
      uploaded:    uploaded.length,
      underReview: underReview.length,
      approved:    approved.length,
      expiring:    expiring.length,
      overdue:     overdue.length,
    },
  });
};

// ─── Lista richieste del cliente ───────────────────────────────────────────
export const getPortalRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  const clientId = req.user.clientId;
  if (!clientId) { res.status(403).json({ error: 'Nessun cliente associato' }); return; }

  const { status, practice_id } = req.query;

  const conditions = [eq(requests.clientId, clientId)];
  if (status)      conditions.push(eq(requests.status, status as any));
  if (practice_id) conditions.push(eq(requests.practiceId, practice_id as string));

  const rows = await db
    .select({
      id:              requests.id,
      docTypeCode:     requests.docTypeCode,
      period:          requests.period,
      status:          requests.status,
      deadline:        requests.deadline,
      notes:           requests.notes,
      rejectionReason: requests.rejectionReason,
      practiceId:      requests.practiceId,
      createdAt:       requests.createdAt,
      updatedAt:       requests.updatedAt,
      // join document types
      docTypeLabel:    documentTypes.label,
      docTypeCategory: documentTypes.category,
      // join documents
      documentId:       documents.id,
      documentFilename: documents.originalFilename,
      documentCreatedAt: documents.createdAt,
    })
    .from(requests)
    .leftJoin(documentTypes,
      and(eq(documentTypes.code, requests.docTypeCode)))
    .leftJoin(documents, eq(documents.requestId, requests.id))
    .where(and(...conditions))
    .orderBy(desc(requests.createdAt));

  res.json(rows);
};

// ─── Upload documento (lato cliente) ──────────────────────────────────────
export const uploadPortalDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id: requestId } = req.params;
  const clientId = req.user.clientId;

  if (!req.file) { res.status(400).json({ error: 'Nessun file caricato' }); return; }

  const request = await db.query.requests.findFirst({
    where: and(eq(requests.id, requestId), eq(requests.clientId, clientId!)),
  });
  if (!request) { res.status(404).json({ error: 'Richiesta non trovata' }); return; }
  if (request.status === 'approved') {
    res.status(400).json({ error: 'Documento già approvato, non modificabile' }); return;
  }
  if (request.status === 'under_review') {
    res.status(400).json({ error: 'Documento in revisione, attendi la risposta dello studio' }); return;
  }

  // Se c'era un documento precedente (rejected), eliminalo
  const existing = await db.query.documents.findFirst({
    where: eq(documents.requestId, requestId),
  });
  if (existing) {
    await getStorage(req.user.tenantId).delete(existing.storagePath);
    await db.delete(documents).where(eq(documents.id, existing.id));
  }

  const ext        = path.extname(req.file.originalname);
  const stored     = `${Date.now()}_${uuidv4()}${ext}`;
  const storagePath = await getStorage(req.user.tenantId).upload(
    { buffer: req.file.buffer, originalname: req.file.originalname,
      mimetype: req.file.mimetype, size: req.file.size },
    path.join(req.user.tenantId, request.docTypeCode, stored),
  );

  const docId = uuidv4();
  await db.insert(documents).values({
    id: docId, tenantId: req.user.tenantId, requestId,
    uploaderId: req.user.id, direction: 'client_to_studio',
    originalFilename: req.file.originalname, storedFilename: stored,
    storagePath, mimeType: req.file.mimetype, sizeBytes: req.file.size,
  });

  await db.update(requests)
    .set({ status: 'uploaded', updatedAt: new Date() })
    .where(eq(requests.id, requestId));

  // Notifica staff
  const staffUsers = await db.query.users.findMany({
    where: and(
      eq(users.tenantId, req.user.tenantId),
      or(eq(users.role, 'admin'), eq(users.role, 'employee')),
    ),
  });
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, req.user.tenantId) });
  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId!) });
  const docType = await db.query.documentTypes.findFirst({
    where: eq(documentTypes.code, request.docTypeCode),
  });

  for (const staff of staffUsers) {
    if (!staff.email) continue;
    await emailService.queue({
      tenantId: req.user.tenantId, toEmail: staff.email,
      subject:  `📥 Documento caricato: ${docType?.label || request.docTypeCode} — ${client?.name}`,
      bodyHtml: `<p>${client?.name} ha caricato <strong>${req.file.originalname}</strong>
                 per la richiesta <strong>${docType?.label || request.docTypeCode}</strong>
                 (periodo ${request.period}).</p>
                 <p><a href="${process.env.APP_URL}/requests">Vai alle richieste →</a></p>`,
      type: 'document_uploaded', refType: 'request', refId: requestId,
    });
  }

  await logAudit(req.user.tenantId, req.user.id, 'CLIENT_UPLOAD',
    `${req.file.originalname} per richiesta ${requestId}`);
  res.status(201).json({ success: true, id: docId });
};

// ─── Lista pratiche (lato cliente) ────────────────────────────────────────
export const getPortalPractices = async (req: AuthRequest, res: Response): Promise<void> => {
  const clientId = req.user.clientId;
  if (!clientId) { res.status(403).json({ error: 'Nessun cliente associato' }); return; }

  const rows = await db.query.practices.findMany({
    where: and(
      eq(practices.clientId, clientId),
      eq(practices.visibleToClient, true),
    ),
    orderBy: [desc(practices.createdAt)],
    with: { requests: true },
  });

  // Calcola stato aggregato per ogni pratica
  const enriched = rows.map(p => {
    const reqs      = p.requests || [];
    const total     = reqs.length;
    const approved  = reqs.filter(r => r.status === 'approved').length;
    const pending   = reqs.filter(r => r.status === 'pending').length;
    const progress  = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { ...p, requestCount: total, approvedCount: approved,
             pendingCount: pending, progress };
  });

  res.json(enriched);
};

// ─── Commento su richiesta (visibile a entrambi) ───────────────────────────
export const addPortalComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id: requestId } = req.params;
  const { body } = req.body;
  if (!body?.trim()) { res.status(400).json({ error: 'Testo del commento richiesto' }); return; }

  const request = await db.query.requests.findFirst({
    where: and(eq(requests.id, requestId), eq(requests.clientId, req.user.clientId!)),
  });
  if (!request) { res.status(404).json({ error: 'Richiesta non trovata' }); return; }

  await db.insert(requestComments).values({
    tenantId: req.user.tenantId, requestId,
    authorId: req.user.id, body: body.trim(),
    visibleToClient: true,
  });

  res.status(201).json({ success: true });
};

// ─── Documenti condivisi dallo studio verso il cliente ────────────────────
export const getPortalDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  const clientId = req.user.clientId;
  if (!clientId) { res.status(403).json({ error: 'Nessun cliente associato' }); return; }

  // Documenti caricati dallo studio verso il cliente
  const shared = await db
    .select()
    .from(documents)
    .innerJoin(requests, eq(documents.requestId, requests.id))
    .where(and(
      eq(requests.clientId, clientId),
      eq(documents.direction, 'studio_to_client'),
    ))
    .orderBy(desc(documents.createdAt));

  res.json(shared);
};
