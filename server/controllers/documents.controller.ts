import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { AuthRequest } from '../middleware/auth.js';
import db from '../../src/db/index.js';
import { createStorageService } from '../services/storage/factory.js';
import { logAudit } from '../services/audit.service.js';

function getStorage(tenantId: string) {
  const t = db.prepare('SELECT storage_provider, storage_config FROM tenants WHERE id=?').get(tenantId) as any;
  return createStorageService(t?.storage_provider || 'local', t?.storage_config || '{}');
}

export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const { request_id } = req.body;
  if (!request_id) { res.status(400).json({ error: 'request_id is required' }); return; }
  if (!req.file)   { res.status(400).json({ error: 'No file uploaded' }); return; }
  const request = db.prepare('SELECT * FROM requests WHERE id=? AND tenant_id=?').get(request_id, req.user.tenant_id) as any;
  if (!request) { res.status(404).json({ error: 'Request not found' }); return; }
  if (request.status === 'uploaded') { res.status(400).json({ error: 'Document already uploaded. Delete it first.' }); return; }

  const ext = path.extname(req.file.originalname);
  const storedName = `${Date.now()}_${uuidv4()}${ext}`;
  const storagePath = await getStorage(req.user.tenant_id).upload(
    { buffer: req.file.buffer, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size },
    path.join(req.user.tenant_id, request.type, storedName)
  );
  const docId = uuidv4();
  db.transaction(() => {
    db.prepare('INSERT INTO documents (id, tenant_id, request_id, uploader_id, original_filename, stored_filename, storage_path, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(docId, req.user.tenant_id, request_id, req.user.id, req.file!.originalname, storedName, storagePath, req.file!.mimetype, req.file!.size);
    db.prepare("UPDATE requests SET status='uploaded' WHERE id=?").run(request_id);
  })();
  logAudit(req.user.tenant_id, req.user.id, 'UPLOAD_DOCUMENT', `Uploaded ${req.file.originalname}`);
  res.status(201).json({ success: true, id: docId });
};

export const downloadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = db.prepare('SELECT * FROM documents WHERE id=? AND tenant_id=?').get(req.params.id, req.user.tenant_id) as any;
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }
  const buffer = await getStorage(req.user.tenant_id).download(doc.storage_path);
  res.setHeader('Content-Disposition', `attachment; filename="${doc.original_filename}"`);
  res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
  res.send(buffer);
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = db.prepare('SELECT * FROM documents WHERE id=? AND tenant_id=?').get(req.params.id, req.user.tenant_id) as any;
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }
  db.transaction(() => {
    db.prepare('DELETE FROM documents WHERE id=?').run(doc.id);
    db.prepare("UPDATE requests SET status='pending' WHERE id=?").run(doc.request_id);
  })();
  await getStorage(req.user.tenant_id).delete(doc.storage_path);
  logAudit(req.user.tenant_id, req.user.id, 'DELETE_DOCUMENT', `Deleted ${doc.original_filename}`);
  res.json({ success: true });
};