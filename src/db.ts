import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const db = new Database('doccollector.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  // Tenants
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      storage_provider TEXT DEFAULT 'local',
      storage_config TEXT DEFAULT '{}'
    )
  `);

  // Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      email TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'operator',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id)
    )
  `);

  // Clients
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      internal_code TEXT,
      tax_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id)
    )
  `);

  // Requests
  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      period TEXT NOT NULL, -- YYYYMM
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id),
      FOREIGN KEY(client_id) REFERENCES clients(id)
    )
  `);

  // Documents
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT,
      path TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      uploaded_by TEXT,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id),
      FOREIGN KEY(request_id) REFERENCES requests(id)
    )
  `);

  // Audit Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id)
    )
  `);

  // Seed initial data if empty
  const tenantCount = db.prepare('SELECT count(*) as count FROM tenants').get() as { count: number };
  if (tenantCount.count === 0) {
    const tenantId = uuidv4();
    db.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)').run(tenantId, 'Demo Studio');
    
    // Create superadmin
    const superAdminId = uuidv4();
    db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(
      superAdminId, 'system', 'super@admin.com', 'Super Admin', 'superadmin'
    );

    // Tenant 1: Demo Studio
    const tenant1Id = uuidv4();
    db.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)').run(tenant1Id, 'Studio Rossi (Demo)');
    
    const admin1Id = uuidv4();
    db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(
      admin1Id, tenant1Id, 'admin@rossi.com', 'Mario Rossi', 'admin'
    );

    // Clients for Tenant 1
    const clients1 = [
      { name: 'Acme Corp', code: 'ACM01', tax: 'IT12345678901' },
      { name: 'Omega Solutions', code: 'OMG02', tax: 'IT98765432109' },
      { name: 'Beta Logistics', code: 'BTA03', tax: 'IT11223344556' }
    ];

    for (const c of clients1) {
      const cid = uuidv4();
      db.prepare('INSERT INTO clients (id, tenant_id, name, internal_code, tax_id) VALUES (?, ?, ?, ?, ?)').run(
        cid, tenant1Id, c.name, c.code, c.tax
      );
      
      // Client User
      db.prepare('INSERT INTO users (id, tenant_id, email, name, role, client_id) VALUES (?, ?, ?, ?, ?, ?)').run(
        uuidv4(), tenant1Id, `contact@${c.code.toLowerCase()}.com`, `${c.name} Contact`, 'client', cid
      );

      // Mock Requests
      const types = ['FATT', 'CUD', 'BANK'];
      const periods = ['202310', '202311', '202312', '202401'];
      
      for (const p of periods) {
        const type = types[Math.floor(Math.random() * types.length)];
        const rid = uuidv4();
        const status = Math.random() > 0.5 ? 'uploaded' : 'pending';
        
        db.prepare('INSERT INTO requests (id, tenant_id, client_id, period, type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          rid, tenant1Id, cid, p, type, status, new Date().toISOString()
        );

        if (status === 'uploaded') {
           db.prepare('INSERT INTO documents (id, tenant_id, request_id, filename, original_filename, path, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
             uuidv4(), tenant1Id, rid, `${c.name}_${p}_${type}.pdf`, 'doc.pdf', 'mock/path', admin1Id
           );
        }
      }
    }

    // Tenant 2: Studio Bianchi
    const tenant2Id = uuidv4();
    db.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)').run(tenant2Id, 'Studio Bianchi');
    
    const admin2Id = uuidv4();
    db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(
      admin2Id, tenant2Id, 'admin@bianchi.com', 'Luigi Bianchi', 'admin'
    );

     // Clients for Tenant 2
     const clients2 = [
      { name: 'Gamma Services', code: 'GMA01', tax: 'IT55667788990' },
      { name: 'Delta Force', code: 'DLT02', tax: 'IT00998877665' }
    ];

    for (const c of clients2) {
      const cid = uuidv4();
      db.prepare('INSERT INTO clients (id, tenant_id, name, internal_code, tax_id) VALUES (?, ?, ?, ?, ?)').run(
        cid, tenant2Id, c.name, c.code, c.tax
      );
    }

    console.log('Database seeded with Super Admin, 2 Tenants, Clients, and Mock Data.');
  } else {
    // Ensure superadmin exists for existing installations
    const superAdmin = db.prepare("SELECT * FROM users WHERE role = 'superadmin' LIMIT 1").get();
    if (!superAdmin) {
       db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(
        uuidv4(), 'system', 'super@admin.com', 'Super Admin', 'superadmin'
      );
      console.log('Added missing Super Admin.');
    }
  }
}

// Migration helper to ensure client_id exists (for existing DBs)
try {
  db.exec('ALTER TABLE users ADD COLUMN client_id TEXT REFERENCES clients(id)');
} catch (e) {
  // Column likely exists
}

export default db;
