import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, gt } from 'drizzle-orm';
import db from '../../src/db/index.pg.ts';
import {
  users, tenants, clients, clientTokens,
} from '../../src/db/schema.pg.ts';
import { logAudit } from '../services/audit.service.ts';
import { emailService } from '../services/email/email.service.ts';
import { templates } from '../services/email/templates.ts';
import jwt from 'jsonwebtoken';


// ─── Google / mock login (staff) ──────────────────────────────────────────
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;
  if (!token) { res.status(400).json({ error: 'Token required' }); return; }

  let email = token;
  if (token === 'mock-token')            email = 'admin@studiodemo.com';
  else if (token === 'superadmin-token') email = 'superadmin@doccollector.com';
  else if (token === 'employee-token')   email = 'dipendente@studiodemo.com';

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    res.status(404).json({ error: 'User not registered', code: 'USER_NOT_FOUND', email });
    return;
  }
  if (!user.isActive) { res.status(403).json({ error: 'Account disabilitato' }); return; }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await logAudit(user.tenantId, user.id, 'LOGIN', `${user.email} logged in`);

  res.json({
    token: jwt.sign({ sub: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' }),
    user: { id: user.id, email: user.email, name: user.name,
            role: user.role, tenant_id: user.tenantId, client_id: user.clientId },
  });
};

// ─── Magic Link — richiesta (cliente digita la sua email) ─────────────────
export const requestMagicLink = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: 'Email richiesta' }); return; }

  // Trova utente con ruolo client
  const user = await db.query.users.findFirst({
    where: and(eq(users.email, email), eq(users.role, 'client')),
  });

  // Risposta sempre 200 (sicurezza: non rivelare se email esiste)
  if (!user || !user.isActive) {
    res.json({ message: 'Se l\'email è registrata, riceverai il link di accesso.' });
    return;
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, user.tenantId) });
  const client = user.clientId
    ? await db.query.clients.findFirst({ where: eq(clients.id, user.clientId) })
    : null;

  // Genera token opaco con scadenza 72h
  const token     = uuidv4();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  await db.insert(clientTokens).values({
    tenantId: user.tenantId, userId: user.id, token, expiresAt,
  });

  const magicUrl  = `${process.env.APP_URL}/portale/accesso?token=${token}`;
  const tpl       = templates.magicLink(
    { name: tenant?.name || 'Lo Studio', primaryColor: tenant?.primaryColor || '#4f46e5',
      logoUrl: tenant?.logoUrl, emailSignature: tenant?.emailSignature },
    { clientName: client?.name || user.name || email, magicUrl },
  );

  await emailService.sendNow({
    tenantId: user.tenantId, toEmail: email,
    subject: tpl.subject, bodyHtml: tpl.bodyHtml,
    type: 'magic_link', userId: user.id,
  });

  await logAudit(user.tenantId, user.id, 'MAGIC_LINK_SENT', email);
  res.json({ message: 'Se l\'email è registrata, riceverai il link di accesso.' });
};

// ─── Magic Link — verifica token e crea sessione ──────────────────────────
export const verifyMagicLink = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query as { token: string };
  if (!token) { res.status(400).json({ error: 'Token mancante' }); return; }

  const record = await db.query.clientTokens.findFirst({
    where: and(eq(clientTokens.token, token), gt(clientTokens.expiresAt, new Date())),
  });

  if (!record) {
    res.status(401).json({ error: 'Link scaduto o non valido. Richiedi un nuovo accesso.' });
    return;
  }
  if (record.usedAt) {
    res.status(401).json({ error: 'Link già utilizzato. Richiedi un nuovo accesso.' });
    return;
  }

  // Invalida il token (monouso)
  await db.update(clientTokens).set({ usedAt: new Date() }).where(eq(clientTokens.id, record.id));

  const user = await db.query.users.findFirst({ where: eq(users.id, record.userId) });
  if (!user || !user.isActive) { res.status(403).json({ error: 'Account non valido' }); return; }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await logAudit(user.tenantId, user.id, 'CLIENT_LOGIN', `Magic link usato da ${user.email}`);

  res.json({
    token: jwt.sign({ sub: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' }),
    user: { id: user.id, email: user.email, name: user.name,
            role: user.role, tenant_id: user.tenantId, client_id: user.clientId },
  });
};

// ─── Register tenant ──────────────────────────────────────────────────────
export const registerTenant = async (req: Request, res: Response): Promise<void> => {
  const { email, tenantName, userName } = req.body;
  if (!email || !tenantName) { res.status(400).json({ error: 'email e tenantName richiesti' }); return; }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) { res.status(400).json({ error: 'Utente già esistente' }); return; }

  const [tenant] = await db.insert(tenants).values({
    name: tenantName,
    slug: tenantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
  }).returning();

  const [user] = await db.insert(users).values({
    tenantId: tenant.id, email,
    name: userName || email.split('@')[0], role: 'admin',
  }).returning();

  res.json({
    token: jwt.sign({ sub: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' }),
    user: { id: user.id, email, name: user.name, role: 'admin', tenant_id: tenant.id },
  });
};

// ─── /me ──────────────────────────────────────────────────────────────────
export const getMe = async (req: any, res: Response): Promise<void> => {
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, req.user.tenantId) });
  res.json({ user: req.user, tenant });
};