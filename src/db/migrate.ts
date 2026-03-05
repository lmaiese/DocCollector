import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  console.log('[Migrate] Running...');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('[Migrate] Done.');
  await pool.end();
}
run().catch(err => { console.error(err); process.exit(1); });