import type { Config } from 'drizzle-kit';
export default {
  schema:    './src/db/schema.pg.ts',
  out:       './src/db/migrations',
  driver:    'pg',
  dbCredentials: { connectionString: process.env.DATABASE_URL! },
} satisfies Config;