// server/controllers/documents.controller.ts
// SOSTITUISCI l'intero file con questo:
import { Response } from 'express';
import { eq, and } from 'drizzle-orm';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.pg.ts';
import { documents, requests, tenants, clients, users, documentTypes } from '../../src/db/schema.pg.ts';
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

export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const { request_id } = req.body;
  if (!request_id) { res.status(400).json({ error: 'request_id is required' }); return; }
  if (!req.file)   { res.status(400).json({ error: 'No file uploaded' }); return; }

  const request = await db.query.requests.findFirst({
    where: and(eq(requests.id, request_id), eq(requests.tenantId, req.user.tenantId)),
  });
  if (!request) { res.status(404).json({ error: 'Request not found' }); return; }
  if (request.status === 'uploaded') {
    res.status(400).json({ error: 'Document already uploaded. Delete it first.' }); return;
  }

  const ext        = path.extname(req.file.originalname);
  const storedName = `${Date.now()}_${uuidv4()}${ext}`;
  const storage    = await getStorage(req.user.tenantId);

  const storagePath = await storage.upload(
    { buffer: req.file.buffer, originalname: req.file.originalname,
      mimetype: req.file.mimetype, size: req.file.size },
    path.join(req.user.tenantId, request.docTypeCode, storedName),
  );

  const [doc] = await db.insert(documents).values({
    id:               uuidv4(),
    tenantId:         req.user.tenantId,
    requestId:        request_id,
    uploaderId:       req.user.id,
    direction:        'client_to_studio',
    originalFilename: req.file.originalname,
    storedFilename:   storedName,
    storagePath,
    mimeType:         req.file.mimetype,
    sizeBytes:        req.file.size,
  }).returning();

  await db.update(requests)
    .set({ status: 'uploaded', updatedAt: new Date() })
    .where(eq(requests.id, request_id));

  await logAudit(req.user.tenantId, req.user.id, 'UPLOAD_DOCUMENT', `Uploaded ${req.file.originalname}`);
  res.status(201).json({ success: true, id: doc.id });
};

// ─── NUOVO: upload documento dallo studio verso il cliente ────────────────────
export const uploadDocumentToClient = async (req: AuthRequest, res: Response): Promise<void> => {
  const { request_id } = req.body;
  if (!request_id) { res.status(400).json({ error: 'request_id is required' }); return; }
  if (!req.file)   { res.status(400).json({ error: 'No file uploaded' }); return; }

  const request = await db.query.requests.findFirst({
    where: and(eq(requests.id, request_id), eq(requests.tenantId, req.user.tenantId)),
  });
  if (!request) { res.status(404).json({ error: 'Request not found' }); return; }

  const ext         = path.extname(req.file.originalname);
  const storedName  = `${Date.now()}_${uuidv4()}${ext}`;
  const storage     = await getStorage(req.user.tenantId);

  const storagePath = await storage.upload(
    { buffer: req.file.buffer, originalname: req.file.originalname,
      mimetype: req.file.mimetype, size: req.file.size },
    path.join(req.user.tenantId, 'studio_to_client', storedName),
  );

  const [doc] = await db.insert(documents).values({
    id:               uuidv4(),
    tenantId:         req.user.tenantId,
    requestId:        request_id,
    uploaderId:       req.user.id,
    direction:        'studio_to_client',
    originalFilename: req.file.originalname,
    storedFilename:   storedName,
    storagePath,
    mimeType:         req.file.mimetype,
    sizeBytes:        req.file.size,
  }).returning();

  // Notifica cliente
  const [client, tenant, docType, clientUser] = await Promise.all([
    db.query.clients.findFirst({ where: eq(clients.id, request.clientId) }),
    db.query.tenants.findFirst({ where: eq(tenants.id, req.user.tenantId) }),
    db.query.documentTypes.findFirst({ where: eq(documentTypes.code, request.docTypeCode) }),
    db.query.users.findFirst({
      where: and(eq(users.clientId, request.clientId), eq(users.tenantId, req.user.tenantId)),
    }),
  ]);

  const emailTo = clientUser?.email || client?.email;
  if (emailTo && tenant) {
    const branding = {
      name: tenant.name, primaryColor: tenant.primaryColor || '#4f46e5',
      logoUrl: tenant.logoUrl, emailSignature: tenant.emailSignature,
    };
    await emailService.queue({
      tenantId: req.user.tenantId,
      toEmail: emailTo,
      subject: `📎 Nuovo documento disponibile: ${docType?.label || request.docTypeCode}`,
      bodyHtml: `
        <p>Gentile ${client?.name || emailTo},</p>
        <p>Lo studio ha condiviso il documento <strong>${req.file.originalname}</strong> (${docType?.label || request.docTypeCode}) nel tuo portale.</p>
        <p><a href="${process.env.APP_URL}/portale/ricevuti">Visualizza i documenti ricevuti →</a></p>
      `,
      type: 'document_shared',
      refType: 'request',
      refId: request_id,
    });
  }

  await logAudit(req.user.tenantId, req.user.id, 'UPLOAD_TO_CLIENT',
    `${req.file.originalname} → cliente ${request.clientId}`);
  res.status(201).json({ success: true, id: doc.id });
};

export const downloadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, req.params.id),
      eq(documents.tenantId, req.user.tenantId),
    ),
  });
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

  const storage = await getStorage(req.user.tenantId);
  const buffer  = await storage.download(doc.storagePath);

  res.setHeader('Content-Disposition', `attachment; filename="${doc.originalFilename}"`);
  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.send(buffer);
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, req.params.id),
      eq(documents.tenantId, req.user.tenantId),
    ),
  });
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

  await db.delete(documents).where(eq(documents.id, doc.id));

  // Ripristina status request solo se era client_to_studio
  if (doc.direction === 'client_to_studio') {
    await db.update(requests)
      .set({ status: 'pending', updatedAt: new Date() })
      .where(eq(requests.id, doc.requestId!));
  }

  const storage = await getStorage(req.user.tenantId);
  await storage.delete(doc.storagePath);

  await logAudit(req.user.tenantId, req.user.id, 'DELETE_DOCUMENT', `Deleted ${doc.originalFilename}`);
  res.json({ success: true });
};
