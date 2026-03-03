import Database from 'better-sqlite3';

const db = new Database('doccollector.db');

try {
  const users = db.prepare('SELECT * FROM users').all();
  console.log('Users found:', users.length);
  users.forEach((u: any) => {
    console.log(`- ${u.name} (${u.role}) - ID: ${u.id}, Tenant: ${u.tenant_id}`);
  });

  const tenants = db.prepare('SELECT * FROM tenants').all();
  console.log('Tenants found:', tenants.length);
  tenants.forEach((t: any) => {
    console.log(`- ${t.name} - ID: ${t.id}`);
  });

  const clients = db.prepare('SELECT * FROM clients').all();
  console.log('Clients found:', clients.length);
  clients.forEach((c: any) => {
    console.log(`- ${c.name} - ID: ${c.id}`);
  });

  const clientUsers = db.prepare("SELECT * FROM users WHERE role = 'client'").all();
  console.log('Client Users found:', clientUsers.length);
  clientUsers.forEach((u: any) => {
    console.log(`- ${u.name} - ID: ${u.id}`);
  });

} catch (error) {
  console.error('Error reading DB:', error);
}
