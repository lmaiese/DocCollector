import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema:    './src/db/schema.pg.ts',
  out:       './src/db/migrations',
  dialect:   'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!.replace('localhost', '127.0.0.1'),
  },
} satisfies Config;