import 'dotenv/config';
import type { Config } from 'drizzle-kit';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL non impostata nel .env');

export default {
  schema:    './src/db/schema.pg.ts',
  out:       './src/db/migrations',
  dialect:   'postgresql',
  dbCredentials: {
    url: dbUrl.replace('localhost', '127.0.0.1'),
  },
} satisfies Config;