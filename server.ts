import express from 'express';
import { createServer as createViteServer } from 'vite';
import db, { initDb } from './src/db.js'; // Note .js extension for ESM
import multer from 'multer';
import { LocalStorageService } from './src/services/storage.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

// Initialize DB
try {
  initDb();
} catch (err: any) {
  fs.writeFileSync('db-init-error.log', err.toString());
  process.exit(1);
}

const storageService = new LocalStorageService();
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  try {
    fs.writeFileSync('server-debug.log', `Starting server... NODE_ENV=${process.env.NODE_ENV}\n`);
    const app = express();
    const PORT = 3000;

    app.use(express.json());
    
    // --- API Routes ---
    
    // Health Check
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Auth: Google Login (Simulated for now, but structure is ready for token verification)
    app.post('/api/auth/google', (req, res) => {
      const { token } = req.body;
      
      // In a real app, verify token with Google:
      // const ticket = await client.verifyIdToken({ idToken: token, audience: CLIENT_ID });
      // const payload = ticket.getPayload();
      // const email = payload['email'];
      
      // For this demo, we simulate by accepting any email in the "token" field if it's just an email string,
      // or we just look up the hardcoded admin email if the token is "mock-token".
      
      let email = '';
      if (token === 'mock-token') {
        email = 'maieseluigi@gmail.com';
      } else if (token === 'superadmin-token') {
        email = 'superadmin@doccollector.com';
      } else {
        // Assume token IS the email for testing simplicity if not mock-token
        email = token;
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

      if (user) {
        // User exists, return token (mock JWT)
        return res.json({
          token: `jwt-for-${user.id}`,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenant_id: user.tenant_id
          }
        });
      } else {
        // User not found
        return res.status(404).json({ error: 'User not registered', code: 'USER_NOT_FOUND', email });
      }
    });

    // Auth: Register Tenant (for new users)
    app.post('/api/auth/register-tenant', (req, res) => {
      const { email, tenantName, userName } = req.body;
      
      if (!email || !tenantName) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      // Check if user already exists
      const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const tenantId = uuidv4();
      const userId = uuidv4();

      try {
        const insertTenant = db.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)');
        const insertUser = db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)');

        db.transaction(() => {
          insertTenant.run(tenantId, tenantName);
          insertUser.run(userId, tenantId, email, userName || email.split('@')[0], 'admin');
        })();

        res.json({
          token: `jwt-for-${userId}`,
          user: {
            id: userId,
            email,
            name: userName,
            role: 'admin',
            tenant_id: tenantId
          }
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // Middleware to simulate JWT verification
    const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1]; // Bearer <token>
      // Mock verification: extract user ID from "jwt-for-<id>"
      if (!token.startsWith('jwt-for-')) {
         return res.status(401).json({ error: 'Invalid token format' });
      }

      const userId = token.replace('jwt-for-', '');
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

      if (!user) return res.status(401).json({ error: 'Invalid token user' });

      (req as any).user = user;
      next();
    };

    // --- Protected Routes ---

    /**
     * GET /api/me
     * Returns the current authenticated user and their tenant information.
     */
    app.get('/api/me', requireAuth, (req, res) => {
      const user = (req as any).user;
      const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(user.tenant_id);
      res.json({ user, tenant });
    });

    /**
     * GET /api/tenants
     * Super Admin Only.
     * Lists all registered tenants in the system.
     */
    app.get('/api/tenants', requireAuth, (req, res) => {
      const user = (req as any).user;
      
      // Strict check: Only superadmin can list tenants
      if (user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
      }

      const tenants = db.prepare('SELECT * FROM tenants ORDER BY name').all();
      res.json(tenants);
    });

    /**
     * POST /api/tenants
     * Super Admin Only.
     * Creates a new Tenant and a default Admin user for that tenant.
     */
    app.post('/api/tenants', requireAuth, (req, res) => {
      const user = (req as any).user;
      
      // Strict check: Only superadmin can create tenants
      if (user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
      }

      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Tenant Name is required' });

      const tenantId = uuidv4();
      const adminId = uuidv4();
      // Generate a default admin email for the new tenant
      const adminEmail = `admin@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

      try {
        db.transaction(() => {
          // Create Tenant
          db.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)').run(tenantId, name);
          
          // Create Admin User for this Tenant
          db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(
            adminId, tenantId, adminEmail, 'Tenant Admin', 'admin'
          );
        })();

        res.json({ id: tenantId, name, adminEmail });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    /**
     * GET /api/documents
     * Lists documents for the current user's tenant.
     * Super Admins are restricted from this endpoint as they do not manage documents.
     */
    app.get('/api/documents', requireAuth, (req, res) => {
      const user = (req as any).user;
      
      // Super Admin does NOT manage documents
      if (user.role === 'superadmin') {
        return res.status(403).json({ error: 'Super Admin cannot manage documents' });
      }

      // Filter by tenant
      let query = `
        SELECT d.*, c.name as client_name, u.name as uploader_name
        FROM documents d
        LEFT JOIN clients c ON d.client_id = c.id
        LEFT JOIN users u ON d.uploader_id = u.id
        WHERE d.tenant_id = ?
      `;
      
      const params = [user.tenant_id];
      
      // Optional filters
      const { type, client_id } = req.query;
      if (type) {
        query += ' AND d.type = ?';
        params.push(type as string);
      }
      if (client_id) {
        query += ' AND d.client_id = ?';
        params.push(client_id as string);
      }

      query += ' ORDER BY d.created_at DESC';

      const docs = db.prepare(query).all(...params);
      res.json(docs);
    });

    /**
     * POST /api/documents
     * Uploads a new document.
     * Restricted to Admin and Employee roles.
     */
    app.post('/api/documents', requireAuth, upload.single('file'), async (req, res) => {
      const user = (req as any).user;
      
      // Super Admin does NOT manage documents
      if (user.role === 'superadmin') {
        return res.status(403).json({ error: 'Super Admin cannot manage documents' });
      }

      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const { type, client_id } = req.body;
      if (!type) return res.status(400).json({ error: 'Type is required' });

      // Save file
      const ext = path.extname(req.file.originalname);
      const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
      const destinationPath = path.join(user.tenant_id, type, filename); // Organize by tenant/type

      try {
        const savedPath = await storageService.upload(req.file, destinationPath);
        const docId = uuidv4();

        db.prepare(`
          INSERT INTO documents (id, tenant_id, uploader_id, client_id, type, filename, path)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(docId, user.tenant_id, user.id, client_id || null, type, req.file.originalname, savedPath);

        // Audit
        db.prepare('INSERT INTO audit_logs (id, tenant_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)').run(
          uuidv4(), user.tenant_id, user.id, 'UPLOAD_DOCUMENT', `Uploaded ${req.file.originalname} as ${type}`
        );

        res.json({ success: true, id: docId });
      } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    });

    /**
     * GET /api/clients
     * Lists clients for the current tenant.
     * Super Admin returns empty list (or forbidden).
     */
    app.get('/api/clients', requireAuth, (req, res) => {
      const user = (req as any).user;
      
      // Super Admin sees all clients? Or should not see clients?
      // Request says "Super admin does not manage documents". Clients are related to documents.
      // However, "Manage Admins" is the main role.
      // Let's assume Super Admin doesn't need to see clients unless managing a tenant context (which we don't have yet).
      // For now, let's restrict or allow read-only? 
      // "Il super admin non si occupa di gestire documenti dall'applicazione" -> Clients are metadata for documents.
      // Let's restrict Client access for Super Admin to keep it clean, or just return empty.
      if (user.role === 'superadmin') {
         return res.json([]); // Or 403. Returning empty list is safer for UI.
      }

      const clients = db.prepare('SELECT * FROM clients WHERE tenant_id = ? ORDER BY name').all(user.tenant_id);
      res.json(clients);
    });

    app.post('/api/clients', requireAuth, (req, res) => {
      const user = (req as any).user;
      if (user.role === 'superadmin') return res.status(403).json({ error: 'Super Admin cannot manage clients' });

      const { name, code } = req.body;
      if (!name) return res.status(400).json({ error: 'Name required' });

      const id = uuidv4();
      db.prepare('INSERT INTO clients (id, tenant_id, name, code) VALUES (?, ?, ?, ?)').run(
        id, user.tenant_id, name, code
      );
      res.json({ id, name, code });
    });

    /**
     * DELETE /api/clients/:id
     * Deletes a client if they have no associated documents.
     */
    app.delete('/api/clients/:id', requireAuth, (req, res) => {
      const user = (req as any).user;
      if (user.role === 'superadmin') return res.status(403).json({ error: 'Super Admin cannot manage clients' });

      const { id } = req.params;

      // Check if client belongs to tenant
      const client = db.prepare('SELECT * FROM clients WHERE id = ? AND tenant_id = ?').get(id, user.tenant_id);
      if (!client) return res.status(404).json({ error: 'Client not found' });

      // Check for existing documents
      const docCount = db.prepare('SELECT count(*) as count FROM documents WHERE client_id = ?').get(id) as { count: number };
      if (docCount.count > 0) {
        return res.status(400).json({ error: 'Cannot delete client with existing documents. Delete documents first.' });
      }

      try {
        db.prepare('DELETE FROM clients WHERE id = ?').run(id);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    /**
     * GET /api/users
     * Admin Only.
     * Lists users within the tenant.
     */
    app.get('/api/users', requireAuth, (req, res) => {
      const user = (req as any).user;
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });

      const users = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE tenant_id = ?').all(user.tenant_id);
      res.json(users);
    });

    app.post('/api/users', requireAuth, (req, res) => {
      const user = (req as any).user;
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });

      const { email, name, role } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required' });

      const id = uuidv4();
      try {
        db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(
          id, user.tenant_id, email, name, role || 'employee'
        );
        res.json({ id, email, name, role });
      } catch (err: any) {
        res.status(400).json({ error: 'User likely exists or invalid data' });
      }
    });

    // Audit Logs (Admin only)
    app.get('/api/audit', requireAuth, (req, res) => {
      const user = (req as any).user;
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });

      const logs = db.prepare(`
        SELECT a.*, u.name as user_name 
        FROM audit_logs a 
        LEFT JOIN users u ON a.user_id = u.id 
        WHERE a.tenant_id = ?
        ORDER BY a.timestamp DESC LIMIT 100
      `).all(user.tenant_id);
      res.json(logs);
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== 'production') {
      try {
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        app.use(vite.middlewares);
      } catch (viteError) {
        console.error('Failed to initialize Vite server:', viteError);
        throw viteError;
      }
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error: any) {
    console.error('Failed to start server:', error);
    fs.writeFileSync('server-startup-error.log', error.toString());
    process.exit(1);
  }
}

startServer();
