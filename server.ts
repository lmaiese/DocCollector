import express from 'express';
import { createServer as createViteServer } from 'vite';
import db, { initDb } from './src/db.js'; // Note .js extension for ESM
import multer from 'multer';
import { LocalStorageService } from './src/services/storage.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Initialize DB
initDb();

const storageService = new LocalStorageService();
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Auth (Mock for preview)
  app.post('/api/auth/login', (req, res) => {
    // In a real app, this would redirect to OAuth provider
    // For preview, we just return the first user found or create a session
    const user = db.prepare('SELECT * FROM users LIMIT 1').get();
    if (user) {
      res.json({ user, token: 'mock-token' });
    } else {
      res.status(401).json({ error: 'No users found' });
    }
  });

  // Dashboard Stats
  app.get('/api/dashboard', (req, res) => {
    const pendingRequests = db.prepare("SELECT count(*) as count FROM requests WHERE status = 'pending'").get() as { count: number };
    const uploadedDocs = db.prepare("SELECT count(*) as count FROM documents").get() as { count: number };
    const missingDocs = pendingRequests.count; // Simplified logic: pending = missing

    res.json({
      pendingRequests: pendingRequests.count,
      uploadedDocs: uploadedDocs.count,
      missingDocs
    });
  });

  // Clients
  app.get('/api/clients', (req, res) => {
    const clients = db.prepare('SELECT * FROM clients ORDER BY name').all();
    res.json(clients);
  });

  app.post('/api/clients', (req, res) => {
    const { name, internal_code, tax_id } = req.body;
    const id = uuidv4();
    // Hardcoded tenant for demo
    const tenant = db.prepare('SELECT id FROM tenants LIMIT 1').get() as { id: string };
    
    try {
      db.prepare('INSERT INTO clients (id, tenant_id, name, internal_code, tax_id) VALUES (?, ?, ?, ?, ?)').run(
        id, tenant.id, name, internal_code, tax_id
      );
      res.json({ id, name, internal_code, tax_id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Requests
  app.get('/api/requests', (req, res) => {
    const requests = db.prepare(`
      SELECT r.*, c.name as client_name 
      FROM requests r 
      JOIN clients c ON r.client_id = c.id 
      ORDER BY r.created_at DESC
    `).all();
    res.json(requests);
  });

  app.post('/api/requests', (req, res) => {
    const { client_id, period, type } = req.body;
    const id = uuidv4();
    const tenant = db.prepare('SELECT id FROM tenants LIMIT 1').get() as { id: string };

    try {
      db.prepare('INSERT INTO requests (id, tenant_id, client_id, period, type) VALUES (?, ?, ?, ?, ?)').run(
        id, tenant.id, client_id, period, type
      );
      
      // Log audit
      const user = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string };
      db.prepare('INSERT INTO audit_logs (id, tenant_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)').run(
        uuidv4(), tenant.id, user.id, 'CREATE_REQUEST', `Request for ${client_id} ${period} ${type}`
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
