import Database from 'better-sqlite3';
import path from 'path';
import { applySchema } from './schema.ts';
import { seedDb } from './seed.ts';

const dbPath = path.join(process.cwd(), 'doccollector.db');
const db = new Database(dbPath);

export function initDb(): void {
  applySchema(db);
  seedDb(db);
  console.log('[DB] Ready at ' + dbPath);
}

export default db;