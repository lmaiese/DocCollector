// server.ts — SOSTITUISCI l'intero file
import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { initDb } from './src/db/index.pg.ts';
import { seedDb }  from './src/db/seed.pg.ts';
import { errorHandler, notFound } from './server/middleware/errorHandler.ts';
import { emailService } from './server/services/email/email.service.ts';
import authRoutes      from './server/routes/auth.routes.ts';
import dashboardRoutes from './server/routes/dashboard.routes.ts';
import clientRoutes    from './server/routes/clients.routes.ts';
import requestRoutes   from './server/routes/requests.routes.ts';
import documentRoutes  from './server/routes/documents.routes.ts';
import userRoutes      from './server/routes/users.routes.ts';
import tenantRoutes    from './server/routes/tenants.routes.ts';
import auditRoutes     from './server/routes/audit.routes.ts';
import portalRoutes    from './server/routes/portal.routes.ts';
import commentRoutes   from './server/routes/comments.routes.ts';
import practiceRoutes  from './server/routes/practices.routes.ts';
import docTypeRoutes   from './server/routes/document-types.routes.ts';
import campaignRoutes  from './server/routes/campaigns.routes.ts';

import cron from 'node-cron';
import { db } from './src/db/index.pg.ts';
import { requests, users, clients, tenants, documentTypes, clientTokens, documents } from './src/db/schema.pg.ts';
import { eq, and, lt } from 'drizzle-orm';
import { templates } from './server/services/email/templates.ts';

// ─── Cron: reminder scadenze (ogni mattina alle 08:00) ─────────────────────
cron.schedule('0 8 * * *', async () => {
  const today   = new Date();
  const targets = [1, 3, 7];

  for (const daysLeft of targets) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysLeft);
    const dateStr = targetDate.toISOString().split('T')[0];

    const pending = await db.query.requests.findMany({
      where: and(eq(requests.status, 'pending'), eq(requests.deadline, dateStr)),
    });

    for (const req of pending) {
      const client   = await db.query.clients.findFirst({ where: eq(clients.id, req.clientId) });
      const tenant   = await db.query.tenants.findFirst({ where: eq(tenants.id, req.tenantId) });
      const docType  = await db.query.documentTypes.findFirst({
        where: eq(documentTypes.code, req.docTypeCode),
      });
      const clientUser = await db.query.users.findFirst({
        where: and(eq(users.clientId, req.clientId), eq(users.tenantId, req.tenantId)),
      });

      const emailTo = clientUser?.email || client?.email;
      if (!emailTo || !tenant) continue;

      const tpl = templates.deadlineReminder(
        {
          name: tenant.name, primaryColor: tenant.primaryColor || '#4f46e5',
          logoUrl: tenant.logoUrl, emailSignature: tenant.emailSignature,
        },
        {
          clientName:   client?.name || emailTo,
          docTypeLabel: docType?.label || req.docTypeCode,
          deadline:     req.deadline!, daysLeft,
          portalUrl:    `${process.env.APP_URL}/portale/richieste`,
        },
      );

      await emailService.queue({
        tenantId: req.tenantId, toEmail: emailTo,
        subject: tpl.subject, bodyHtml: tpl.bodyHtml,
        type: 'deadline_reminder', refType: 'request', refId: req.id,
      });
    }
  }
});

// ─── Cron: cleanup token scaduti (ogni notte alle 03:00) ───────────────────
cron.schedule('0 3 * * *', async () => {
  try {
    await db.delete(clientTokens).where(lt(clientTokens.expiresAt, new Date()));
    console.log('[Cron] Token scaduti eliminati');
  } catch (err) {
    console.error('[Cron] Errore cleanup token:', err);
  }
});

// ─── Cron: GDPR retention — archivia documenti oltre N anni (ogni domenica 02:00) ──
cron.schedule('0 2 * * 0', async () => {
  try {
    const allTenants = await db.query.tenants.findMany({
      columns: { id: true, retentionYears: true },
    });

    for (const tenant of allTenants) {
      const years = tenant.retentionYears ?? 10;
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - years);

      // Soft-archive: marca isArchived=true i documenti oltre la soglia
      const result = await db.update(documents)
        .set({ isArchived: true })
        .where(
          and(
            eq(documents.tenantId, tenant.id),
            eq(documents.isArchived, false),
            lt(documents.createdAt, cutoff),
          ),
        );

      console.log(`[Cron][GDPR] Tenant ${tenant.id}: documenti archiviati`);
    }
  } catch (err) {
    console.error('[Cron][GDPR] Errore retention:', err);
  }
});

async function startServer() {
  await initDb();
  await seedDb();

  const app  = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

  app.use('/api/auth',           authRoutes);
  app.use('/api/dashboard',      dashboardRoutes);
  app.use('/api/clients',        clientRoutes);
  app.use('/api/requests',       requestRoutes);
  app.use('/api/documents',      documentRoutes);
  app.use('/api/users',          userRoutes);
  app.use('/api/tenants',        tenantRoutes);
  app.use('/api/audit',          auditRoutes);
  app.use('/api/portal',         portalRoutes);
  app.use('/api/practices',      practiceRoutes);
  app.use('/api/document-types', docTypeRoutes);
  app.use('/api/campaigns',      campaignRoutes);   // ← NUOVO
  app.use('/api/requests/:requestId/comments', commentRoutes);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
  }

  app.use(notFound);
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] http://localhost:${PORT}`);

    cron.schedule('*/2 * * * *', async () => {
      try { await emailService.processQueue(); }
      catch (err) { console.error('[Cron] Email queue error:', err); }
    });

    console.log('[Cron] Email queue worker avviato (ogni 2 min)');
    console.log('[Cron] GDPR retention cron registrato (domenica 02:00)');
  });
}

startServer().catch(err => { console.error('[Server] Fatal:', err); process.exit(1); });