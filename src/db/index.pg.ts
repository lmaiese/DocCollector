// src/db/index.pg.ts
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

/**
 * Applica lo schema DDL direttamente via SQL — funziona senza drizzle-kit.
 * In produzione usa le migrations; in sviluppo questo è sufficiente.
 */
export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('[DB] PostgreSQL connected:', process.env.DATABASE_URL?.split('@')[1] ?? 'unknown');

    // Crea enum e tabelle se non esistono (idempotente)
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE storage_provider AS ENUM ('local','gdrive','sharepoint');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('superadmin','admin','employee','client');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE request_status AS ENUM ('pending','uploaded','under_review','approved','rejected');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE practice_status AS ENUM ('open','in_progress','completed','delivered','archived');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM (
          'request_created','document_uploaded','document_approved',
          'document_rejected','deadline_reminder','magic_link','document_shared'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE notification_status AS ENUM ('pending','sent','failed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE doc_direction AS ENUM ('client_to_studio','studio_to_client');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      CREATE TABLE IF NOT EXISTS tenants (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name             TEXT NOT NULL,
        slug             TEXT NOT NULL UNIQUE,
        storage_provider storage_provider NOT NULL DEFAULT 'local',
        storage_config   JSONB NOT NULL DEFAULT '{}',
        logo_url         TEXT,
        primary_color    TEXT DEFAULT '#4f46e5',
        email_from       TEXT,
        email_signature  TEXT,
        retention_years  INTEGER DEFAULT 10,
        stripe_customer_id TEXT,
        stripe_plan_id   TEXT,
        is_active        BOOLEAN NOT NULL DEFAULT TRUE,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clients (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name          TEXT NOT NULL,
        internal_code TEXT,
        tax_id        TEXT,
        email         TEXT,
        phone         TEXT,
        notes         TEXT,
        category      TEXT,
        is_active     BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email        TEXT NOT NULL UNIQUE,
        name         TEXT,
        role         user_role NOT NULL DEFAULT 'employee',
        client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
        google_sub   TEXT,
        is_active    BOOLEAN NOT NULL DEFAULT TRUE,
        last_login_at TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS document_types (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
        code        TEXT NOT NULL,
        label       TEXT NOT NULL,
        description TEXT,
        category    TEXT,
        is_system   BOOLEAN NOT NULL DEFAULT FALSE,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order  INTEGER DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS practices (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        title            TEXT NOT NULL,
        type             TEXT,
        fiscal_year      INTEGER,
        status           practice_status NOT NULL DEFAULT 'open',
        assigned_to      UUID REFERENCES users(id) ON DELETE SET NULL,
        deadline         DATE,
        notes            TEXT,
        visible_to_client BOOLEAN NOT NULL DEFAULT TRUE,
        created_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS request_templates (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        description TEXT,
        is_system   BOOLEAN NOT NULL DEFAULT FALSE,
        items       JSONB NOT NULL DEFAULT '[]',
        auto_send   BOOLEAN NOT NULL DEFAULT FALSE,
        cron_expr   TEXT,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS requests (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        practice_id      UUID REFERENCES practices(id) ON DELETE SET NULL,
        doc_type_code    TEXT NOT NULL,
        period           TEXT NOT NULL,
        status           request_status NOT NULL DEFAULT 'pending',
        deadline         DATE,
        notes            TEXT,
        reviewed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at      TIMESTAMPTZ,
        rejection_reason TEXT,
        campaign_id      UUID,
        created_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS documents (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        request_id        UUID REFERENCES requests(id) ON DELETE CASCADE,
        uploader_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        direction         doc_direction NOT NULL DEFAULT 'client_to_studio',
        original_filename TEXT NOT NULL,
        stored_filename   TEXT NOT NULL,
        storage_path      TEXT NOT NULL,
        mime_type         TEXT,
        size_bytes        INTEGER,
        is_encrypted      BOOLEAN NOT NULL DEFAULT TRUE,
        encryption_key_id TEXT,
        retention_until   DATE,
        is_archived       BOOLEAN NOT NULL DEFAULT FALSE,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS request_comments (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        request_id       UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
        author_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        body             TEXT NOT NULL,
        visible_to_client BOOLEAN NOT NULL DEFAULT TRUE,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS client_tokens (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at    TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
        type        notification_type NOT NULL,
        status      notification_status NOT NULL DEFAULT 'pending',
        to_email    TEXT NOT NULL,
        subject     TEXT NOT NULL,
        body_html   TEXT NOT NULL,
        ref_type    TEXT,
        ref_id      UUID,
        sent_at     TIMESTAMPTZ,
        fail_reason TEXT,
        attempts    INTEGER NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
        action     TEXT NOT NULL,
        details    TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Indici (idempotenti)
      CREATE INDEX IF NOT EXISTS clients_tenant_idx     ON clients(tenant_id);
      CREATE INDEX IF NOT EXISTS clients_tax_id_idx     ON clients(tax_id);
      CREATE INDEX IF NOT EXISTS users_tenant_idx       ON users(tenant_id);
      CREATE INDEX IF NOT EXISTS users_client_idx       ON users(client_id);
      CREATE INDEX IF NOT EXISTS practices_tenant_idx   ON practices(tenant_id);
      CREATE INDEX IF NOT EXISTS practices_client_idx   ON practices(client_id);
      CREATE INDEX IF NOT EXISTS practices_status_idx   ON practices(status);
      CREATE INDEX IF NOT EXISTS practices_deadline_idx ON practices(deadline);
      CREATE INDEX IF NOT EXISTS requests_tenant_idx    ON requests(tenant_id);
      CREATE INDEX IF NOT EXISTS requests_client_idx    ON requests(client_id);
      CREATE INDEX IF NOT EXISTS requests_practice_idx  ON requests(practice_id);
      CREATE INDEX IF NOT EXISTS requests_status_idx    ON requests(status);
      CREATE INDEX IF NOT EXISTS requests_deadline_idx  ON requests(deadline);
      CREATE INDEX IF NOT EXISTS requests_campaign_idx  ON requests(campaign_id);
      CREATE INDEX IF NOT EXISTS documents_tenant_idx   ON documents(tenant_id);
      CREATE INDEX IF NOT EXISTS documents_request_idx  ON documents(request_id);
      CREATE INDEX IF NOT EXISTS notifications_status_idx ON notifications(status);
      CREATE INDEX IF NOT EXISTS notifications_tenant_idx ON notifications(tenant_id);
      CREATE INDEX IF NOT EXISTS audit_tenant_idx       ON audit_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS audit_timestamp_idx    ON audit_logs(timestamp);
    `);

    console.log('[DB] Schema applied (idempotent).');
  } finally {
    client.release();
  }
}

export async function closeDb(): Promise<void> {
  await pool.end();
}

export default db;