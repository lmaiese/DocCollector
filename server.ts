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
import commentRoutes from './server/routes/comments.routes.ts';

import cron            from 'node-cron';
import practiceRoutes    from './server/routes/practices.routes.ts';
import docTypeRoutes     from './server/routes/document-types.routes.ts';

import { db } from './src/db/index.pg.ts';
import { requests, users, clients, tenants, documentTypes } from './src/db/schema.pg.ts';
import { eq, and } from 'drizzle-orm';
import { templates } from './server/services/email/templates.ts';

// Dentro startServer(), dopo il cron dell'email worker:
cron.schedule('0 8 * * *', async () => {
  // Ogni mattina alle 8: controlla richieste in scadenza
  const today    = new Date();
  const targets  = [1, 3, 7]; // giorni rimanenti per cui mandare reminder

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
        { name: tenant.name, primaryColor: tenant.primaryColor || '#4f46e5',
          logoUrl: tenant.logoUrl, emailSignature: tenant.emailSignature },
        { clientName: client?.name || emailTo,
          docTypeLabel: docType?.label || req.docTypeCode,
          deadline: req.deadline!, daysLeft,
          portalUrl: `${process.env.APP_URL}/portale/richieste` },
      );

      await emailService.queue({
        tenantId: req.tenantId, toEmail: emailTo,
        subject: tpl.subject, bodyHtml: tpl.bodyHtml,
        type: 'deadline_reminder', refType: 'request', refId: req.id,
      });
    }
  }
});


async function startServer() {
  await initDb();
  await seedDb();

  const app  = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

  app.use('/api/auth',      authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/clients',   clientRoutes);
  app.use('/api/requests',  requestRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/users',     userRoutes);
  app.use('/api/tenants',   tenantRoutes);
  app.use('/api/audit',     auditRoutes);
  app.use('/api/portal',    portalRoutes); 
  app.use('/api/practices',      practiceRoutes);
  app.use('/api/document-types', docTypeRoutes);
  app.use('/api/requests/:requestId/comments', commentRoutes);

  

  // Worker email: ogni 2 minuti processa la coda
  cron.schedule('*/2 * * * *', () => emailService.processQueue());

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
  }

  app.use(notFound);
  app.use(errorHandler);
  app.listen(PORT, '0.0.0.0', () => console.log(`[Server] http://localhost:${PORT}`));
}

startServer().catch(err => { console.error('[Server] Fatal:', err); process.exit(1); });