import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../../src/db/index.ts';
import { logAudit } from '../services/audit.service.ts';

export const googleLogin = (req: Request, res: Response): void => {
  const { token } = req.body;
  if (!token) { res.status(400).json({ error: 'Token required' }); return; }
  let email = '';
  if (token === 'mock-token')            email = 'admin@studiodemo.com';
  else if (token === 'superadmin-token') email = 'superadmin@doccollector.com';
  else if (token === 'employee-token')   email = 'dipendente@studiodemo.com';
  else                                   email = token;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) { res.status(404).json({ error: 'User not registered', code: 'USER_NOT_FOUND', email }); return; }
  logAudit(user.tenant_id, user.id, 'LOGIN', `${user.email} logged in`);
  res.json({ token: `jwt-for-${user.id}`, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenant_id: user.tenant_id } });
};

export const registerTenant = (req: Request, res: Response): void => {
  const { email, tenantName, userName } = req.body;
  if (!email || !tenantName) { res.status(400).json({ error: 'email and tenantName required' }); return; }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) { res.status(400).json({ error: 'User already exists' }); return; }
  const tenantId = uuidv4(); const userId = uuidv4();
  db.transaction(() => {
    db.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)').run(tenantId, tenantName);
    db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(userId, tenantId, email, userName || email.split('@')[0], 'admin');
  })();
  res.json({ token: `jwt-for-${userId}`, user: { id: userId, email, name: userName, role: 'admin', tenant_id: tenantId } });
};

export const getMe = (req: any, res: Response): void => {
  res.json({ user: req.user, tenant: db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.user.tenant_id) });
};