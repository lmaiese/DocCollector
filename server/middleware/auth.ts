import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import db from '../../src/db/index.pg.ts';
import { users } from '../../src/db/schema.pg.ts';

export interface AuthRequest extends Request { user?: any; }

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: 'No token provided' }); return; }

  const token = authHeader.split(' ')[1];
  if (!token?.startsWith('jwt-for-')) { res.status(401).json({ error: 'Invalid token format' }); return; }

  const userId = token.replace('jwt-for-', '');

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  }).catch(() => null);

  if (!user) { res.status(401).json({ error: 'Invalid token' }); return; }
  if (!user.isActive) { res.status(403).json({ error: 'Account disabilitato' }); return; }

  // Espone sia camelCase (nuovo standard PG) che snake_case (retrocompatibilità)
  req.user = {
    ...user,
    // snake_case aliases per i controller non ancora migrati
    tenant_id: user.tenantId,
    client_id: user.clientId,
  };

  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user?.role)) {
      res.status(403).json({ error: `Access denied. Required: ${roles.join(' or ')}` }); return;
    }
    next();
  };
}
