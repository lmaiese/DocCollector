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
    
    // Create admin user
    const userId = uuidv4();
    db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(
      userId, tenantId, 'admin@demo.com', 'Admin User', 'admin'
    );

    // Create a sample client
    const clientId = uuidv4();
    db.prepare('INSERT INTO clients (id, tenant_id, name, internal_code, tax_id) VALUES (?, ?, ?, ?, ?)').run(
      clientId, tenantId, 'Acme Corp', 'ACME001', 'IT12345678901'
    );

    console.log('Database seeded with demo tenant and user.');
  }
}

export default db;
