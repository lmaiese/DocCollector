import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.pg.ts';

const connectionString = (process.env.DATABASE_URL || '')
  .replace('localhost', '127.0.0.1');

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('[DB] PostgreSQL connected:', process.env.DATABASE_URL?.split('@')[1] ?? 'unknown');
  } finally {
    client.release();
  }

  // In sviluppo, applica lo schema automaticamente (equivalente a drizzle-kit push)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { pushSchema } = await import('drizzle-kit/api');
      // pushSchema non è disponibile in tutte le versioni — usiamo migrate manuale
    } catch {
      // fallback silenzioso
    }
  }
}

export async function closeDb(): Promise<void> {
  await pool.end();
}

export default db;