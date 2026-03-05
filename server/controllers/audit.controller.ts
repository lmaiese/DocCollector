import { Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.pg.ts';
import { auditLogs, users } from '../../src/db/schema.pg.ts';

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { limit = '100', action, user_id } = req.query;

  const conditions: any[] = [eq(auditLogs.tenantId, req.user.tenantId)];
  if (action)  conditions.push(eq(auditLogs.action, action as string));
  if (user_id) conditions.push(eq(auditLogs.userId, user_id as string));

  const rows = await db
    .select({
      id:        auditLogs.id,
      action:    auditLogs.action,
      details:   auditLogs.details,
      timestamp: auditLogs.timestamp,
      userId:    auditLogs.userId,
      user_name: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .where(and(...conditions))
    .orderBy(desc(auditLogs.timestamp))
    .limit(parseInt(limit as string, 10));

  res.json(rows);
};
