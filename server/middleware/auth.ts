import { Request, Response, NextFunction } from 'express';
import db from '../../src/db/index.ts';

export interface AuthRequest extends Request { user?: any; }

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: 'No token provided' }); return; }
  const token = authHeader.split(' ')[1];
  if (!token?.startsWith('jwt-for-')) { res.status(401).json({ error: 'Invalid token format' }); return; }
  const userId = token.replace('jwt-for-', '');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) { res.status(401).json({ error: 'Invalid token' }); return; }
  req.user = user;
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
