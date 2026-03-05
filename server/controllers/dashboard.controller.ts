import { Response } from 'express';
import { eq, and, gte, lt, lte, count } from 'drizzle-orm';
import { subDays, format, addDays } from 'date-fns';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.pg.ts';
import { requests, documents, tenants, users } from '../../src/db/schema.pg.ts';

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user;

  // ── Superadmin: statistiche globali ──────────────────────────────────────
  if (user.role === 'superadmin') {
    const [tenantCount]   = await db.select({ c: count() }).from(tenants);
    const [userCount]     = await db.select({ c: count() }).from(users);
    const [documentCount] = await db.select({ c: count() }).from(documents);

    res.json({
      isSuperAdmin:    true,
      pendingRequests: tenantCount.c,
      missingDocs:     userCount.c,
      uploadedDocs:    documentCount.c,
      chartData:       [],
      expiringThisWeek: 0,
      overdueRequests:  0,
    });
    return;
  }

  // ── Staff: statistiche per tenant ─────────────────────────────────────────
  const tid     = user.tenantId;
  const today   = new Date();
  today.setHours(0, 0, 0, 0);
  const in7days = addDays(today, 7);
  const todayStr  = format(today,   'yyyy-MM-dd');
  const in7Str    = format(in7days, 'yyyy-MM-dd');

  const [pendingResult] = await db
    .select({ c: count() })
    .from(requests)
    .where(and(eq(requests.tenantId, tid), eq(requests.status, 'pending')));

  const [uploadedResult] = await db
    .select({ c: count() })
    .from(documents)
    .where(eq(documents.tenantId, tid));

  // Richieste in scadenza nei prossimi 7 giorni (pending)
  const allPending = await db.query.requests.findMany({
    where: and(eq(requests.tenantId, tid), eq(requests.status, 'pending')),
    columns: { deadline: true },
  });

  const expiringThisWeek = allPending.filter(r =>
    r.deadline && r.deadline >= todayStr && r.deadline <= in7Str
  ).length;

  const overdueRequests = allPending.filter(r =>
    r.deadline && r.deadline < todayStr
  ).length;

  // Chart ultimi 7 giorni
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const day      = subDays(today, i);
    const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(day); dayEnd.setHours(23, 59, 59, 999);

    const [{ c }] = await db
      .select({ c: count() })
      .from(requests)
      .where(
        and(
          eq(requests.tenantId, tid),
          gte(requests.createdAt, dayStart),
          lte(requests.createdAt, dayEnd),
        ),
      );

    chartData.push({ date: format(day, 'MMM d'), count: Number(c) });
  }

  res.json({
    pendingRequests:  Number(pendingResult.c),
    uploadedDocs:     Number(uploadedResult.c),
    missingDocs:      Number(pendingResult.c),
    expiringThisWeek,
    overdueRequests,
    chartData,
  });
};
