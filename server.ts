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

    // Auth (Mock for preview)
    app.post('/api/auth/login', (req, res) => {
      const { role } = req.body; // 'admin', 'client', 'superadmin'
      
      let user;
      if (role === 'client') {
        user = db.prepare("SELECT * FROM users WHERE role = 'client' LIMIT 1").get();
      } else if (role === 'superadmin') {
        user = db.prepare("SELECT * FROM users WHERE role = 'superadmin' LIMIT 1").get();
      } else {
        // Default to the first admin of the first tenant for 'admin' role
        // In a real app, user would enter email/password
        user = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();
      }

      if (user) {
        res.json({ user, token: 'mock-token' });
      } else {
        res.status(401).json({ error: 'No user found for this role' });
      }
    });

    // Dashboard Stats
    app.get('/api/dashboard', (req, res) => {
      const userId = req.headers['x-user-id'] as string;
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      // Superadmin sees global stats
      if (user.role === 'superadmin') {
        const totalTenants = db.prepare("SELECT count(*) as count FROM tenants").get() as { count: number };
        const totalUsers = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
        const totalDocs = db.prepare("SELECT count(*) as count FROM documents").get() as { count: number };
        
        return res.json({
          pendingRequests: totalTenants.count, // Hack to reuse UI card
          uploadedDocs: totalDocs.count,
          missingDocs: totalUsers.count, // Hack to reuse UI card
          isSuperAdmin: true
        });
      }

      // Tenant Scoped Stats
      let pendingQuery = `SELECT count(*) as count FROM requests WHERE tenant_id = '${user.tenant_id}' AND status = 'pending'`;
      let uploadedQuery = `SELECT count(*) as count FROM documents WHERE tenant_id = '${user.tenant_id}'`;
      
      if (user.role === 'client') {
        pendingQuery += ` AND client_id = '${user.client_id}'`;
        uploadedQuery = `
          SELECT count(*) as count 
          FROM documents d
          JOIN requests r ON d.request_id = r.id
          WHERE r.client_id = '${user.client_id}'
        `;
      }

      const pendingRequests = db.prepare(pendingQuery).get() as { count: number };
      const uploadedDocs = db.prepare(uploadedQuery).get() as { count: number };
      
      // Calculate missing docs (pending requests)
      const missingDocs = pendingRequests.count;

      // Get recent activity (last 7 days requests) for chart
      const chartData = db.prepare(`
          SELECT date(created_at) as date, count(*) as count 
          FROM requests 
          WHERE tenant_id = ? 
          GROUP BY date(created_at) 
          ORDER BY date(created_at) DESC 
          LIMIT 7
      `).all(user.tenant_id);

      res.json({
        pendingRequests: pendingRequests.count,
        uploadedDocs: uploadedDocs.count,
        missingDocs,
        chartData
      });
    });

    // Tenants (Superadmin only)
    app.get('/api/tenants', (req, res) => {
      const userId = req.headers['x-user-id'] as string;
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      
      if (!user || user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });

      const tenants = db.prepare('SELECT * FROM tenants ORDER BY name').all();
      res.json(tenants);
    });

    app.post('/api/tenants', (req, res) => {
      const userId = req.headers['x-user-id'] as string;
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      
      if (!user || user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });

      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });

      const id = uuidv4();
      try {
        db.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)').run(id, name);
        
        // Create a default admin for this tenant
        const adminId = uuidv4();
        const adminEmail = `admin@${name.toLowerCase().replace(/\s+/g, '')}.com`;
        db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(
          adminId, id, adminEmail, 'Admin User', 'admin'
        );

        res.json({ id, name, adminEmail });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // Clients
    app.get('/api/clients', (req, res) => {
      const userId = req.headers['x-user-id'] as string;
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      if (user.role === 'superadmin') {
         // Superadmin sees all clients with tenant info
         const clients = db.prepare(`
           SELECT c.*, t.name as tenant_name 
           FROM clients c 
           JOIN tenants t ON c.tenant_id = t.id 
           ORDER BY t.name, c.name
         `).all();
         return res.json(clients);
      }

      const clients = db.prepare('SELECT * FROM clients WHERE tenant_id = ? ORDER BY name').all(user.tenant_id);
      res.json(clients);
    });

    app.post('/api/clients', (req, res) => {
      const userId = req.headers['x-user-id'] as string;
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      if (!user || user.role === 'client') return res.status(403).json({ error: 'Forbidden' });

      const { name, internal_code, tax_id } = req.body;
      const id = uuidv4();
      
      try {
        db.prepare('INSERT INTO clients (id, tenant_id, name, internal_code, tax_id) VALUES (?, ?, ?, ?, ?)').run(
          id, user.tenant_id, name, internal_code, tax_id
        );
        res.json({ id, name, internal_code, tax_id });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // Requests
    app.get('/api/requests', (req, res) => {
      const userId = req.headers['x-user-id'] as string;
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      let query = `
        SELECT r.*, c.name as client_name, d.id as document_id, d.filename as document_filename
        FROM requests r 
        JOIN clients c ON r.client_id = c.id 
        LEFT JOIN documents d ON r.id = d.request_id
      `;

      if (user.role === 'superadmin') {
         // See all requests
      } else {
         query += ` WHERE r.tenant_id = '${user.tenant_id}'`;
         if (user.role === 'client') {
           query += ` AND r.client_id = '${user.client_id}'`;
         }
      }

      query += ` ORDER BY r.created_at DESC`;

      const requests = db.prepare(query).all();
      res.json(requests);
    });

    app.post('/api/requests', (req, res) => {
      const userId = req.headers['x-user-id'] as string;
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      if (!user || user.role === 'client') return res.status(403).json({ error: 'Forbidden' });

      const { client_id, period, type } = req.body;
      const id = uuidv4();
      
      try {
        db.prepare('INSERT INTO requests (id, tenant_id, client_id, period, type) VALUES (?, ?, ?, ?, ?)').run(
          id, user.tenant_id, client_id, period, type
        );
        
        // Log audit
        db.prepare('INSERT INTO audit_logs (id, tenant_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)').run(
          uuidv4(), user.tenant_id, user.id, 'CREATE_REQUEST', `Request for ${client_id} ${period} ${type}`
        );

        res.json({ id, status: 'pending' });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // Upload
    app.post('/api/upload', upload.single('file'), async (req, res) => {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      
      const { request_id } = req.body;
      if (!request_id) return res.status(400).json({ error: 'Missing request_id' });

      const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(request_id) as any;
      if (!request) return res.status(404).json({ error: 'Request not found' });

      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(request.client_id) as any;
      
      // Naming convention: CLIENT_YYYYMM_TIPO.ext
      const ext = path.extname(req.file.originalname);
      const newFilename = `${client.name.replace(/\s+/g, '_')}_${request.period}_${request.type}${ext}`;
      
      // Folder structure: /Client/Year/Type/file
      const year = request.period.substring(0, 4);
      const destinationPath = path.join(client.name, year, request.type, newFilename);

      try {
        const savedPath = await storageService.upload(req.file, destinationPath);
        
        const docId = uuidv4();
        const tenant = db.prepare('SELECT id FROM tenants LIMIT 1').get() as { id: string };
        const user = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string };

        // Save doc record
        db.prepare('INSERT INTO documents (id, tenant_id, request_id, filename, original_filename, path, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          docId, tenant.id, request_id, newFilename, req.file.originalname, savedPath, user.id
        );

        // Update request status
        db.prepare("UPDATE requests SET status = 'uploaded' WHERE id = ?").run(request_id);

        // Audit
        db.prepare('INSERT INTO audit_logs (id, tenant_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)').run(
          uuidv4(), tenant.id, user.id, 'UPLOAD_DOCUMENT', `Uploaded ${newFilename}`
        );

        res.json({ success: true, filename: newFilename });
      } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    });

    // Download
    app.get('/api/documents/:id/download', async (req, res) => {
      const { id } = req.params;
      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
      
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      try {
        const fileBuffer = await storageService.download(doc.path);
        
        res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(fileBuffer);
        
        // Audit download
        // Note: In a real app we'd get user from auth middleware/header
        // For simplicity we skip audit here or need to pass user id in query param
      } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    });

    // Delete Request
    app.delete('/api/requests/:id', (req, res) => {
      const { id } = req.params;
      const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id) as any;
      
      if (!request) return res.status(404).json({ error: 'Request not found' });
      if (request.status === 'uploaded') {
        return res.status(400).json({ error: 'Cannot delete request with uploaded document. Delete document first.' });
      }

      try {
        db.prepare('DELETE FROM requests WHERE id = ?').run(id);
        
        // Audit
        const userId = req.headers['x-user-id'] as string; // Assuming passed
        if (userId) {
          const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
          if (user) {
            db.prepare('INSERT INTO audit_logs (id, tenant_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)').run(
              uuidv4(), user.tenant_id, user.id, 'DELETE_REQUEST', `Deleted request ${id}`
            );
          }
        }
        
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // Delete Document
    app.delete('/api/documents/:id', async (req, res) => {
      const { id } = req.params;
      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
      
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      try {
        await storageService.delete(doc.path);
        
        db.prepare('DELETE FROM documents WHERE id = ?').run(id);
        db.prepare("UPDATE requests SET status = 'pending' WHERE id = ?").run(doc.request_id);

        // Audit
        const userId = req.headers['x-user-id'] as string;
        if (userId) {
          const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
          if (user) {
            db.prepare('INSERT INTO audit_logs (id, tenant_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)').run(
              uuidv4(), user.tenant_id, user.id, 'DELETE_DOCUMENT', `Deleted document ${doc.filename}`
            );
          }
        }

        res.json({ success: true });
      } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    });

    // Audit Logs
    app.get('/api/audit', (req, res) => {
      const logs = db.prepare(`
        SELECT a.*, u.name as user_name 
        FROM audit_logs a 
        LEFT JOIN users u ON a.user_id = u.id 
        ORDER BY a.timestamp DESC LIMIT 50
      `).all();
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
