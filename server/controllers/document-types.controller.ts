import { Response } from 'express';
import { eq, and, or, isNull } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.pg.ts';
import { documentTypes } from '../../src/db/schema.pg.ts';

export const getDocumentTypes = async (req: AuthRequest, res: Response): Promise<void> => {
  // Restituisce i tipi di sistema + quelli custom del tenant
  const rows = await db.query.documentTypes.findMany({
    where: and(
      eq(documentTypes.isActive, true),
      or(
        isNull(documentTypes.tenantId),         // tipi di sistema
        eq(documentTypes.tenantId, req.user.tenantId), // tipi custom del tenant
      ),
    ),
    orderBy: (dt, { asc }) => [asc(dt.sortOrder), asc(dt.label)],
  });
  res.json(rows);
};

export const createDocumentType = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, label, description, category } = req.body;
  if (!code || !label) {
    res.status(400).json({ error: 'code e label sono obbligatori' }); return;
  }
  const [dt] = await db.insert(documentTypes).values({
    tenantId: req.user.tenantId,
    code: code.toUpperCase().replace(/\s/g, '_'),
    label, description: description || null,
    category: category || 'Altro',
    isSystem: false,
  }).returning();
  res.status(201).json(dt);
};

export const deleteDocumentType = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const dt = await db.query.documentTypes.findFirst({
    where: and(eq(documentTypes.id, id), eq(documentTypes.tenantId, req.user.tenantId)),
  });
  if (!dt) { res.status(404).json({ error: 'Tipo documento non trovato' }); return; }
  if (dt.isSystem) { res.status(400).json({ error: 'I tipi di sistema non possono essere eliminati' }); return; }
  // Soft delete
  await db.update(documentTypes).set({ isActive: false }).where(eq(documentTypes.id, id));
  res.json({ success: true });
};