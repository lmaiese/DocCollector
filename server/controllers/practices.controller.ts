import { Response } from 'express';
import { eq, and, desc, ilike } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.pg.ts';
import { practices, requests, clients, users } from '../../src/db/schema.pg.ts';
import { logAudit } from '../services/audit.service.ts';

export const getPractices = async (req: AuthRequest, res: Response): Promise<void> => {
  const { client_id, status, search, assigned_to } = req.query;
  const conditions: any[] = [eq(practices.tenantId, req.user.tenantId)];
  if (client_id)   conditions.push(eq(practices.clientId, client_id as string));
  if (status)      conditions.push(eq(practices.status, status as any));
  if (assigned_to) conditions.push(eq(practices.assignedTo, assigned_to as string));
  if (search)      conditions.push(ilike(practices.title, `%${search}%`));

  const rows = await db
    .select({
      id:              practices.id,
      title:           practices.title,
      type:            practices.type,
      fiscalYear:      practices.fiscalYear,
      status:          practices.status,
      deadline:        practices.deadline,
      notes:           practices.notes,
      visibleToClient: practices.visibleToClient,
      createdAt:       practices.createdAt,
      updatedAt:       practices.updatedAt,
      clientId:        practices.clientId,
      clientName:      clients.name,
      assignedTo:      practices.assignedTo,
      assigneeName:    users.name,
    })
    .from(practices)
    .innerJoin(clients, eq(clients.id, practices.clientId))
    .leftJoin(users, eq(users.id, practices.assignedTo))
    .where(and(...conditions))
    .orderBy(desc(practices.createdAt));

  // Arricchisci con conteggi richieste
  const enriched = await Promise.all(rows.map(async p => {
    const reqs = await db.query.requests.findMany({
      where: eq(requests.practiceId, p.id),
      columns: { id: true, status: true },
    });
    const total    = reqs.length;
    const approved = reqs.filter(r => r.status === 'approved').length;
    const pending  = reqs.filter(r => r.status === 'pending').length;
    const rejected = reqs.filter(r => r.status === 'rejected').length;
    return {
      ...p,
      requestCount:  total,
      approvedCount: approved,
      pendingCount:  pending,
      rejectedCount: rejected,
      progress:      total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  }));

  res.json(enriched);
};

export const getPractice = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const practice = await db.query.practices.findFirst({
    where: and(eq(practices.id, id), eq(practices.tenantId, req.user.tenantId)),
    with: {
      client: true,
      requests: {
        with: { documents: true, comments: true },
        orderBy: (r, { asc }) => [asc(r.createdAt)],
      },
    },
  });
  if (!practice) { res.status(404).json({ error: 'Pratica non trovata' }); return; }
  res.json(practice);
};

export const createPractice = async (req: AuthRequest, res: Response): Promise<void> => {
  const { client_id, title, type, fiscal_year,
          deadline, notes, assigned_to, visible_to_client } = req.body;

  if (!client_id || !title) {
    res.status(400).json({ error: 'client_id e title sono obbligatori' }); return;
  }
  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, client_id), eq(clients.tenantId, req.user.tenantId)),
  });
  if (!client) { res.status(404).json({ error: 'Cliente non trovato' }); return; }

  const [practice] = await db.insert(practices).values({
    tenantId:        req.user.tenantId,
    clientId:        client_id,
    title,
    type:            type            || null,
    fiscalYear:      fiscal_year     || null,
    deadline:        deadline        || null,
    notes:           notes           || null,
    assignedTo:      assigned_to     || null,
    visibleToClient: visible_to_client !== false,
    createdBy:       req.user.id,
  }).returning();

  await logAudit(req.user.tenantId, req.user.id, 'CREATE_PRACTICE',
    `"${title}" per ${client.name}`);
  res.status(201).json(practice);
};

export const updatePractice = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const existing = await db.query.practices.findFirst({
    where: and(eq(practices.id, id), eq(practices.tenantId, req.user.tenantId)),
  });
  if (!existing) { res.status(404).json({ error: 'Pratica non trovata' }); return; }

  const { title, type, fiscal_year, status, deadline,
          notes, assigned_to, visible_to_client } = req.body;

  await db.update(practices).set({
    title:           title            ?? existing.title,
    type:            type             ?? existing.type,
    fiscalYear:      fiscal_year      ?? existing.fiscalYear,
    status:          status           ?? existing.status,
    deadline:        deadline         ?? existing.deadline,
    notes:           notes            ?? existing.notes,
    assignedTo:      assigned_to      ?? existing.assignedTo,
    visibleToClient: visible_to_client ?? existing.visibleToClient,
    updatedAt:       new Date(),
  }).where(eq(practices.id, id));

  await logAudit(req.user.tenantId, req.user.id, 'UPDATE_PRACTICE', `"${existing.title}"`);
  res.json({ success: true });
};

export const deletePractice = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const practice = await db.query.practices.findFirst({
    where: and(eq(practices.id, id), eq(practices.tenantId, req.user.tenantId)),
    with: { requests: { columns: { id: true } } },
  });
  if (!practice) { res.status(404).json({ error: 'Pratica non trovata' }); return; }
  if ((practice.requests?.length || 0) > 0) {
    res.status(400).json({ error: 'Elimina prima tutte le richieste collegate alla pratica' }); return;
  }
  await db.delete(practices).where(eq(practices.id, id));
  await logAudit(req.user.tenantId, req.user.id, 'DELETE_PRACTICE', `"${practice.title}"`);
  res.json({ success: true });
};