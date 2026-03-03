import Database from 'better-sqlite3';

const DEMO_TENANT_ID = 'demo-tenant-1';
const ADMIN_ID       = 'user-admin-1';
const SUPERADMIN_ID  = 'user-superadmin-1';
const EMPLOYEE_ID    = 'user-employee-1';
const CLIENT_1_ID    = 'client-acme-1';
const CLIENT_2_ID    = 'client-beta-2';

export function seedDb(db: Database.Database): void {
  const { count } = db.prepare('SELECT count(*) as count FROM tenants').get() as { count: number };
  if (count > 0) return;

  console.log('[DB] Seeding demo data...');
  const today     = new Date();
  const in3days   = new Date(today); in3days.setDate(today.getDate() + 3);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  db.transaction(() => {
    db.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)').run(DEMO_TENANT_ID, 'Studio Demo');
    db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(ADMIN_ID,      DEMO_TENANT_ID, 'admin@studiodemo.com',         'Mario Admin',      'admin');
    db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(SUPERADMIN_ID, DEMO_TENANT_ID, 'superadmin@doccollector.com',   'Super Admin',      'superadmin');
    db.prepare('INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, ?)').run(EMPLOYEE_ID,   DEMO_TENANT_ID, 'dipendente@studiodemo.com',     'Luigi Dipendente', 'employee');
    db.prepare('INSERT INTO clients (id, tenant_id, name, internal_code, tax_id, email) VALUES (?, ?, ?, ?, ?, ?)').run(CLIENT_1_ID, DEMO_TENANT_ID, 'Acme S.r.l.', 'ACM001', '12345678901', 'contabilita@acme.it');
    db.prepare('INSERT INTO clients (id, tenant_id, name, internal_code, tax_id, email) VALUES (?, ?, ?, ?, ?, ?)').run(CLIENT_2_ID, DEMO_TENANT_ID, 'Beta S.p.A.', 'BET002', '98765432100', 'info@beta.it');
    db.prepare('INSERT INTO requests (id, tenant_id, client_id, period, type, status, deadline, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('req-1', DEMO_TENANT_ID, CLIENT_1_ID, '202501', 'FATT', 'pending', in3days.toISOString().split('T')[0],   ADMIN_ID);
    db.prepare('INSERT INTO requests (id, tenant_id, client_id, period, type, status, deadline, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('req-2', DEMO_TENANT_ID, CLIENT_1_ID, '202501', 'BANK', 'pending', yesterday.toISOString().split('T')[0], ADMIN_ID);
    db.prepare('INSERT INTO requests (id, tenant_id, client_id, period, type, status, deadline, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('req-3', DEMO_TENANT_ID, CLIENT_2_ID, '202412', 'CUD',  'pending', null,                                 ADMIN_ID);
  })();
  console.log('[DB] Seeding complete.');
}