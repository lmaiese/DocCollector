import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.ts';
import { logAudit } from '../services/audit.service.ts';

export const getClients = (req: AuthRequest, res: Response): void => {
  if (req.user.role === 'superadmin') { res.json([]); return; }
  const { search } = req.query;
  let query = 'SELECT * FROM clients WHERE tenant_id = ?';
  const params: any[] = [req.user.tenant_id];
  if (search) { query += ' AND (name LIKE ? OR internal_code LIKE ? OR tax_id LIKE ?)'; const l = `%${search}%`; params.push(l, l, l); }
  res.json(db.prepare(query + ' ORDER BY name').all(...params));
};

export const createClient = (req: AuthRequest, res: Response): void => {
  const { name, internal_code, tax_id, email, phone, notes } = req.body;
  if (!name) { res.status(400).json({ error: 'Name is required' }); return; }
  const id = uuidv4();
  db.prepare('INSERT INTO clients (id, tenant_id, name, internal_code, tax_id, email, phone, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.user.tenant_id, name, internal_code??null, tax_id??null, email??null, phone??null, notes??null);
  logAudit(req.user.tenant_id, req.user.id, 'CREATE_CLIENT', `Created: ${name}`);
  res.status(201).json({ id, name, internal_code, tax_id, email, phone, notes });
};

export const updateClient = (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  if (!db.prepare('SELECT * FROM clients WHERE id=? AND tenant_id=?').get(id, req.user.tenant_id)) { res.status(404).json({ error: 'Client not found' }); return; }
  const { name, internal_code, tax_id, email, phone, notes } = req.body;
  db.prepare('UPDATE clients SET name=?, internal_code=?, tax_id=?, email=?, phone=?, notes=? WHERE id=?')
    .run(name, internal_code??null, tax_id??null, email??null, phone??null, notes??null, id);
  logAudit(req.user.tenant_id, req.user.id, 'UPDATE_CLIENT', `Updated: ${name}`);
  res.json({ success: true });
};

export const deleteClient = (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  if (!db.prepare('SELECT * FROM clients WHERE id=? AND tenant_id=?').get(id, req.user.tenant_id)) { res.status(404).json({ error: 'Client not found' }); return; }
  if ((db.prepare('SELECT count(*) as count FROM requests WHERE client_id=?').get(id) as any).count > 0) { res.status(400).json({ error: 'Cannot delete client with existing requests' }); return; }
  db.prepare('DELETE FROM clients WHERE id=?').run(id);
  logAudit(req.user.tenant_id, req.user.id, 'DELETE_CLIENT', `Deleted client id: ${id}`);
  res.json({ success: true });
};
