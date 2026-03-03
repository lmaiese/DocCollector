import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import db from '../../src/db/index.js';
import { logAudit } from '../services/audit.service.js';

export const getUsers    = (req: AuthRequest, res: Response): void => { res.json(db.prepare('SELECT id, email, name, role, created_at FROM users WHERE tenant_id=? ORDER BY name').all(req.user.tenant_id)); };
export const createUser  = (req: AuthRequest, res: Response): void => {
  const { email, name, role } = req.body;
  if (!email) { res.status(400).json({ error: 'Email is required' }); return; }
  if (!['admin','employee'].includes(role)) { res.status(400).json({ error: 'Role must be admin or employee' }); return; }
  const id = uuidv4();
  try {
    db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(id, req.user.tenant_id, email, name || email.split('@')[0], role);
    logAudit(req.user.tenant_id, req.user.id, 'CREATE_USER', `Created ${email} as ${role}`);
    res.status(201).json({ id, email, name, role });
  } catch { res.status(400).json({ error: 'User with this email already exists' }); }
};
export const deleteUser  = (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  if (id === req.user.id) { res.status(400).json({ error: 'Cannot delete your own account' }); return; }
  if (!db.prepare('SELECT * FROM users WHERE id=? AND tenant_id=?').get(id, req.user.tenant_id)) { res.status(404).json({ error: 'User not found' }); return; }
  db.prepare('DELETE FROM users WHERE id=?').run(id);
  logAudit(req.user.tenant_id, req.user.id, 'DELETE_USER', `Deleted user id: ${id}`);
  res.json({ success: true });
};
