import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.ts';
import { logAudit } from '../services/audit.service.ts';

export const getTenants   = (req: AuthRequest, res: Response): void => { res.json(db.prepare('SELECT * FROM tenants ORDER BY name').all()); };
export const createTenant = (req: AuthRequest, res: Response): void => {
  const { name, adminEmail } = req.body;
  if (!name || !adminEmail) { res.status(400).json({ error: 'name and adminEmail are required' }); return; }
  const tenantId = uuidv4(); const adminId = uuidv4();
  db.transaction(() => {
    db.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)').run(tenantId, name);
    db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(adminId, tenantId, adminEmail, 'Tenant Admin', 'admin');
  })();
  logAudit(tenantId, req.user.id, 'CREATE_TENANT', `Tenant "${name}" created`);
  res.status(201).json({ id: tenantId, name, adminEmail });
};