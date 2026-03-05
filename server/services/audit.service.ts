import db from '../../src/db/index.pg.ts';
import { auditLogs } from '../../src/db/schema.pg.ts';

export async function logAudit(
  tenantId: string,
  userId: string | null,
  action: string,
  details?: string,
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      tenantId,
      userId:  userId ?? null,
      action,
      details: details ?? null,
    });
  } catch (err) {
    console.error('[AUDIT] Failed to write log:', err);
  }
}
