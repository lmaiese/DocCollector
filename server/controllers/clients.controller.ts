import { Response } from 'express';
import { eq, and, or, ilike } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.pg.ts';
import { clients } from '../../src/db/schema.pg.ts';
import { logAudit } from '../services/audit.service.ts';

export const getClients = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user.role === 'superadmin') { res.json([]); return; }

  const { search } = req.query;

  const rows = await db.query.clients.findMany({
    where: search
      ? and(
          eq(clients.tenantId, req.user.tenantId),
          or(
            ilike(clients.name,         `%${search}%`),
            ilike(clients.internalCode, `%${search}%`),
            ilike(clients.taxId,        `%${search}%`),
          ),
        )
      : eq(clients.tenantId, req.user.tenantId),
    orderBy: (c, { asc }) => [asc(c.name)],
  });

  res.json(rows);
};

export const createClient = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, internal_code, tax_id, email, phone, notes } = req.body;
  if (!name) { res.status(400).json({ error: 'Name is required' }); return; }

  const [client] = await db.insert(clients).values({
    tenantId:     req.user.tenantId,
    name,
    internalCode: internal_code ?? null,
    taxId:        tax_id        ?? null,
    email:        email         ?? null,
    phone:        phone         ?? null,
    notes:        notes         ?? null,
  }).returning();

  await logAudit(req.user.tenantId, req.user.id, 'CREATE_CLIENT', `Created: ${name}`);
  res.status(201).json(client);
};

export const updateClient = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const existing = await db.query.clients.findFirst({
    where: and(eq(clients.id, id), eq(clients.tenantId, req.user.tenantId)),
  });
  if (!existing) { res.status(404).json({ error: 'Client not found' }); return; }

  const { name, internal_code, tax_id, email, phone, notes } = req.body;

  await db.update(clients).set({
    name:         name          ?? existing.name,
    internalCode: internal_code ?? existing.internalCode,
    taxId:        tax_id        ?? existing.taxId,
    email:        email         ?? existing.email,
    phone:        phone         ?? existing.phone,
    notes:        notes         ?? existing.notes,
    updatedAt:    new Date(),
  }).where(eq(clients.id, id));

  await logAudit(req.user.tenantId, req.user.id, 'UPDATE_CLIENT', `Updated: ${name}`);
  res.json({ success: true });
};

export const deleteClient = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const existing = await db.query.clients.findFirst({
    where: and(eq(clients.id, id), eq(clients.tenantId, req.user.tenantId)),
  });
  if (!existing) { res.status(404).json({ error: 'Client not found' }); return; }

  // Controlla se ci sono richieste collegate
  const linked = await db.query.requests.findFirst({
    where: (r, { eq }) => eq(r.clientId, id),
    columns: { id: true },
  });
  if (linked) {
    res.status(400).json({ error: 'Cannot delete client with existing requests' }); return;
  }

  await db.delete(clients).where(eq(clients.id, id));
  await logAudit(req.user.tenantId, req.user.id, 'DELETE_CLIENT', `Deleted client id: ${id}`);
  res.json({ success: true });
};
