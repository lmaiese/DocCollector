import { Response } from 'express';
import { eq, and } from 'drizzle-orm';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.pg.ts';
import { documents, requests, tenants } from '../../src/db/schema.pg.ts';
import { createStorageService } from '../services/storage/factory.ts';
import { logAudit } from '../services/audit.service.ts';

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
    {
      buffer:       req.file.buffer,
      originalname: req.file.originalname,
      mimetype:     req.file.mimetype,
      size:         req.file.size,
    },
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

  await logAudit(req.user.tenantId, req.user.id, 'UPLOAD_DOCUMENT',
    `Uploaded ${req.file.originalname}`);

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

  await db.update(requests)
    .set({ status: 'pending', updatedAt: new Date() })
    .where(eq(requests.id, doc.requestId!));

  const storage = await getStorage(req.user.tenantId);
  await storage.delete(doc.storagePath);

  await logAudit(req.user.tenantId, req.user.id, 'DELETE_DOCUMENT',
    `Deleted ${doc.originalFilename}`);

  res.json({ success: true });
};
