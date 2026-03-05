import { Response } from 'express';
import { eq, and, asc } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.pg.ts';
import { requestComments, requests, users } from '../../src/db/schema.pg.ts';

export const getComments = async (req: AuthRequest, res: Response): Promise<void> => {
  const { requestId } = req.params;

  const request = await db.query.requests.findFirst({
    where: and(eq(requests.id, requestId), eq(requests.tenantId, req.user.tenantId)),
  });
  if (!request) { res.status(404).json({ error: 'Richiesta non trovata' }); return; }

  const rows = await db
    .select({
      id:              requestComments.id,
      body:            requestComments.body,
      visibleToClient: requestComments.visibleToClient,
      createdAt:       requestComments.createdAt,
      authorId:        requestComments.authorId,
      authorName:      users.name,
      authorRole:      users.role,
    })
    .from(requestComments)
    .innerJoin(users, eq(users.id, requestComments.authorId))
    .where(eq(requestComments.requestId, requestId))
    .orderBy(asc(requestComments.createdAt));

  res.json(rows);
};

export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { requestId } = req.params;
  const { body, visible_to_client = true } = req.body;
  if (!body?.trim()) { res.status(400).json({ error: 'Testo richiesto' }); return; }

  const request = await db.query.requests.findFirst({
    where: and(eq(requests.id, requestId), eq(requests.tenantId, req.user.tenantId)),
  });
  if (!request) { res.status(404).json({ error: 'Richiesta non trovata' }); return; }

  const [comment] = await db.insert(requestComments).values({
    tenantId:        req.user.tenantId,
    requestId,
    authorId:        req.user.id,
    body:            body.trim(),
    visibleToClient: visible_to_client,
  }).returning();

  res.status(201).json(comment);
};