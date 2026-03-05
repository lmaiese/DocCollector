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
    slug: `${slug}-${Date.now()}`, // suffisso per garantire unicità
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
