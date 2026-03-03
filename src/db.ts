import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const dbPath = path.join(process.cwd(), 'doc_collector.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  const schema = `
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      role TEXT CHECK(role IN ('admin', 'employee', 'superadmin')) NOT NULL,
      google_sub TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants (id),
      UNIQUE(email)
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      uploader_id TEXT NOT NULL,
      client_id TEXT,
      type TEXT NOT NULL,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants (id),
      FOREIGN KEY (uploader_id) REFERENCES users (id),
      FOREIGN KEY (client_id) REFERENCES clients (id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    );
  `;

  db.exec(schema);
  
  // Seed initial data if empty (Optional, for demo purposes)
  const stmt = db.prepare('SELECT count(*) as count FROM tenants');
  const result = stmt.get() as { count: number };
  
  if (result.count === 0) {
    console.log('Seeding database...');
    const tenantId = 'demo-tenant-1';
    const adminId = 'user-admin-1';
    const superAdminId = 'user-superadmin-1';
    
    // Create a demo tenant
    db.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)').run(tenantId, 'Studio Demo');
    
    // Create a default admin user
    db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)')
      .run(adminId, tenantId, 'maieseluigi@gmail.com', 'Luigi Admin', 'admin');

    // Create a Super Admin user (assigned to the demo tenant for simplicity, but role is key)
    db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)')
      .run(superAdminId, tenantId, 'superadmin@doccollector.com', 'Super Admin', 'superadmin');

    // Create a demo client
    db.prepare('INSERT INTO clients (id, tenant_id, name, code) VALUES (?, ?, ?, ?)')
      .run('client-1', tenantId, 'Acme Corp', 'ACM001');
      
    console.log('Database seeded.');
  }
}

export default db;
