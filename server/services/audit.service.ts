import { v4 as uuidv4 } from 'uuid';
import db from '../../src/db/index.ts';

export function logAudit(tenantId: string, userId: string | null, action: string, details?: string): void {
  try {
    db.prepare('INSERT INTO audit_logs (id, tenant_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), tenantId, userId, action, details ?? null);
  } catch (err) { console.error('[AUDIT] Failed to write log:', err); }
}