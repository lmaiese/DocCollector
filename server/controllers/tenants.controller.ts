import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.pg.ts';
import { tenants, users } from '../../src/db/schema.pg.ts';
import { logAudit } from '../services/audit.service.ts';

export const getTenants = async (req: AuthRequest, res: Response): Promise<void> => {
  const rows = await db.query.tenants.findMany({
    orderBy: (t, { asc }) => [asc(t.name)],
  });
  res.json(rows);
};

export const createTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, adminEmail } = req.body;
  if (!name || !adminEmail) {
    res.status(400).json({ error: 'name and adminEmail are required' }); return;
  }

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const [tenant] = await db.insert(tenants).values({
    name,
    slug: `${slug}-${Date.now()}`,
  }).returning();

  const [admin] = await db.insert(users).values({
    tenantId: tenant.id,
    email:    adminEmail,
    name:     'Tenant Admin',
    role:     'admin',
  }).returning();

  await logAudit(tenant.id, req.user.id, 'CREATE_TENANT', `Tenant "${name}" created`);

  res.status(201).json({
    id:         tenant.id,
    name:       tenant.name,
    adminEmail: admin.email,
  });
};

// Aggiorna impostazioni del proprio tenant (solo admin)
export const updateTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.params.id || req.user.tenantId;

  // Un admin può aggiornare solo il suo tenant; il superadmin può aggiornare qualsiasi tenant
  if (req.user.role !== 'superadmin' && tenantId !== req.user.tenantId) {
    res.status(403).json({ error: 'Non autorizzato' }); return;
  }

  const existing = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!existing) { res.status(404).json({ error: 'Tenant non trovato' }); return; }

  const {
    name, logoUrl, primaryColor,
    emailFrom, emailSignature, retentionYears,
  } = req.body;

  await db.update(tenants).set({
    name:           name           ?? existing.name,
    logoUrl:        logoUrl        ?? existing.logoUrl,
    primaryColor:   primaryColor   ?? existing.primaryColor,
    emailFrom:      emailFrom      ?? existing.emailFrom,
    emailSignature: emailSignature ?? existing.emailSignature,
    retentionYears: retentionYears ?? existing.retentionYears,
    updatedAt:      new Date(),
  }).where(eq(tenants.id, tenantId));

  await logAudit(req.user.tenantId, req.user.id, 'UPDATE_TENANT',
    `Aggiornato tenant ${tenantId}`);

  res.json({ success: true });
};

// Restituisce il tenant corrente dell'utente autenticato
export const getMyTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, req.user.tenantId),
  });
  if (!tenant) { res.status(404).json({ error: 'Tenant non trovato' }); return; }
  res.json(tenant);
};