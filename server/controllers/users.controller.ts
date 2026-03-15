import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.pg.ts';
import { users, clients, clientTokens, tenants } from '../../src/db/schema.pg.ts';
import { logAudit } from '../services/audit.service.ts';
import { emailService } from '../services/email/email.service.ts';
import { templates } from '../services/email/templates.ts';

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const rows = await db.query.users.findMany({
    where: eq(users.tenantId, req.user.tenantId),
    columns: { id: true, email: true, name: true, role: true,
               clientId: true, isActive: true, createdAt: true },
    orderBy: (u, { asc }) => [asc(u.name)],
  });
  res.json(rows);
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, name, role, clientId } = req.body;
  if (!email) { res.status(400).json({ error: 'Email richiesta' }); return; }
  if (!['admin', 'employee', 'client'].includes(role)) {
    res.status(400).json({ error: 'Role deve essere admin, employee o client' }); return;
  }

  if (role === 'client' && !clientId) {
    res.status(400).json({ error: 'clientId obbligatorio per utenti con ruolo client' }); return;
  }
  if (role === 'client' && clientId) {
    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, clientId), eq(clients.tenantId, req.user.tenantId)),
    });
    if (!client) { res.status(404).json({ error: 'Cliente non trovato' }); return; }
  }

  try {
    const [user] = await db.insert(users).values({
      tenantId: req.user.tenantId, email,
      name: name || email.split('@')[0], role,
      clientId: clientId || null,
    }).returning();

    await logAudit(req.user.tenantId, req.user.id, 'CREATE_USER',
      `Creato ${email} come ${role}`);

    if (role === 'client') {
      const token     = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db.insert(clientTokens).values({
        tenantId: req.user.tenantId, userId: user.id, token, expiresAt,
      });

      const magicUrl = `${process.env.APP_URL}/portale/accesso?token=${token}`;
      const tenant   = await db.query.tenants.findFirst({
        where: eq(tenants.id, req.user.tenantId),
      });
      const client = clientId
        ? await db.query.clients.findFirst({ where: eq(clients.id, clientId) })
        : null;

      const tpl = templates.magicLink(
        {
          name: tenant?.name || 'Lo Studio',
          primaryColor: tenant?.primaryColor || '#4f46e5',
          logoUrl: tenant?.logoUrl,
          emailSignature: tenant?.emailSignature,
        },
        { clientName: client?.name || name || email, magicUrl },
      );

      await emailService.sendNow({
        tenantId: req.user.tenantId, toEmail: email,
        subject: `Benvenuto su ${tenant?.name || 'DocCollector+'}! Accedi al portale`,
        bodyHtml: tpl.bodyHtml, type: 'magic_link', userId: user.id,
      });
    }

    res.status(201).json({ id: user.id, email, name: user.name, role });
  } catch {
    res.status(400).json({ error: 'Utente con questa email già esistente' });
  }
};

// FIX: aggiunto updateUser — necessario per Sprint 2 (toggle isActive, cambio nome/ruolo)
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  if (id === req.user.id) {
    res.status(400).json({ error: 'Non puoi modificare il tuo stesso account da qui' }); return;
  }

  const existing = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.tenantId, req.user.tenantId)),
  });
  if (!existing) { res.status(404).json({ error: 'Utente non trovato' }); return; }

  const { name, isActive, role } = req.body;

  // Non permettere di cambiare ruolo a superadmin
  if (role && role === 'superadmin') {
    res.status(403).json({ error: 'Non puoi assegnare il ruolo superadmin' }); return;
  }

  await db.update(users).set({
    name:      name      ?? existing.name,
    isActive:  isActive  ?? existing.isActive,
    role:      role      ?? existing.role,
    updatedAt: new Date(),
  }).where(eq(users.id, id));

  await logAudit(req.user.tenantId, req.user.id, 'UPDATE_USER',
    `Aggiornato ${existing.email}: isActive=${isActive ?? existing.isActive}`);

  res.json({ success: true });
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  if (id === req.user.id) {
    res.status(400).json({ error: 'Non puoi eliminare il tuo account' }); return;
  }
  const user = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.tenantId, req.user.tenantId)),
  });
  if (!user) { res.status(404).json({ error: 'Utente non trovato' }); return; }
  await db.delete(users).where(eq(users.id, id));
  await logAudit(req.user.tenantId, req.user.id, 'DELETE_USER', `Eliminato ${user.email}`);
  res.json({ success: true });
};