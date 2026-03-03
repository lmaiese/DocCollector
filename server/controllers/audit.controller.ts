import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import db from '../../src/db/index.js';

export const getAuditLogs = (req: AuthRequest, res: Response): void => {
  const { limit = '100', action, user_id } = req.query;
  let query = 'SELECT a.*, u.name AS user_name FROM audit_logs a LEFT JOIN users u ON a.user_id=u.id WHERE a.tenant_id=?';
  const params: any[] = [req.user.tenant_id];
  if (action)  { query += ' AND a.action=?';   params.push(action); }
  if (user_id) { query += ' AND a.user_id=?';  params.push(user_id); }
  res.json(db.prepare(query + ` ORDER BY a.timestamp DESC LIMIT ${parseInt(limit as string, 10)}`).all(...params));
};