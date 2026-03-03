import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import db from '../../src/db/index.js';
import { logAudit } from '../services/audit.service.js';

export const getRequests = (req: AuthRequest, res: Response): void => {
  const tid = req.user.tenant_id;
  const { status, type, client_id, period, deadline_from, deadline_to, search } = req.query;
  let query = `SELECT r.*, c.name AS client_name, d.id AS document_id, d.original_filename AS document_filename
    FROM requests r JOIN clients c ON r.client_id=c.id LEFT JOIN documents d ON d.request_id=r.id WHERE r.tenant_id=?`;
  const params: any[] = [tid];
  if (status)        { query += ' AND r.status=?';    params.push(status); }
  if (type)          { query += ' AND r.type=?';      params.push(type); }
  if (client_id)     { query += ' AND r.client_id=?'; params.push(client_id); }
  if (period)        { query += ' AND r.period LIKE ?'; params.push(`%${period}%`); }
  if (deadline_from) { query += ' AND r.deadline>=?'; params.push(deadline_from); }
  if (deadline_to)   { query += ' AND r.deadline<=?'; params.push(deadline_to); }
  if (search) { query += ' AND (c.name LIKE ? OR r.type LIKE ? OR r.period LIKE ?)'; const l=`%${search}%`; params.push(l,l,l); }
  res.json(db.prepare(query + ' ORDER BY r.created_at DESC').all(...params));
};

export const createRequest = (req: AuthRequest, res: Response): void => {
  const { client_id, period, type, deadline, notes } = req.body;
  if (!client_id || !period || !type) { res.status(400).json({ error: 'client_id, period and type are required' }); return; }
  if (!/^\d{6}$/.test(period)) { res.status(400).json({ error: 'Period must be in YYYYMM format' }); return; }
  if (!db.prepare('SELECT id FROM clients WHERE id=? AND tenant_id=?').get(client_id, req.user.tenant_id)) { res.status(404).json({ error: 'Client not found' }); return; }
  const id = uuidv4();
  db.prepare('INSERT INTO requests (id, tenant_id, client_id, period, type, status, deadline, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.user.tenant_id, client_id, period, type, 'pending', deadline??null, notes??null, req.user.id);
  logAudit(req.user.tenant_id, req.user.id, 'CREATE_REQUEST', `${type} for period ${period}`);
  res.status(201).json({ id, client_id, period, type, status: 'pending', deadline, notes });
};

export const updateRequest = (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  if (!db.prepare('SELECT * FROM requests WHERE id=? AND tenant_id=?').get(id, req.user.tenant_id)) { res.status(404).json({ error: 'Request not found' }); return; }
  const { deadline, notes } = req.body;
  db.prepare('UPDATE requests SET deadline=?, notes=? WHERE id=?').run(deadline??null, notes??null, id);
  res.json({ success: true });
};

export const deleteRequest = (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const request = db.prepare('SELECT * FROM requests WHERE id=? AND tenant_id=?').get(id, req.user.tenant_id) as any;
  if (!request) { res.status(404).json({ error: 'Request not found' }); return; }
  if (request.status === 'uploaded') { res.status(400).json({ error: 'Delete the document first' }); return; }
  db.prepare('DELETE FROM requests WHERE id=?').run(id);
  logAudit(req.user.tenant_id, req.user.id, 'DELETE_REQUEST', `Deleted request id: ${id}`);
  res.json({ success: true });
};