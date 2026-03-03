import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { initDb } from './src/db/index.js';
import { errorHandler, notFound } from './server/middleware/errorHandler.js';
import authRoutes      from './server/routes/auth.routes.js';
import dashboardRoutes from './server/routes/dashboard.routes.js';
import clientRoutes    from './server/routes/clients.routes.js';
import requestRoutes   from './server/routes/requests.routes.js';
import documentRoutes  from './server/routes/documents.routes.js';
import userRoutes      from './server/routes/users.routes.js';
import tenantRoutes    from './server/routes/tenants.routes.js';
import auditRoutes     from './server/routes/audit.routes.js';

try { initDb(); } catch (err: any) { fs.writeFileSync('db-init-error.log', String(err)); process.exit(1); }

async function startServer() {
  const app  = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.use(express.json());
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
  app.use('/api/auth',      authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/clients',   clientRoutes);
  app.use('/api/requests',  requestRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/users',     userRoutes);
  app.use('/api/tenants',   tenantRoutes);
  app.use('/api/audit',     auditRoutes);
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
  }
  app.use(notFound);
  app.use(errorHandler);
  app.listen(PORT, '0.0.0.0', () => console.log(`[Server] Running at http://localhost:${PORT}`));
}
startServer().catch(err => { console.error('[Server] Fatal:', err); process.exit(1); });