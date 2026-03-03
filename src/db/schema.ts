import Database from 'better-sqlite3';

export function applySchema(db: Database.Database): void {
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      storage_provider TEXT CHECK(storage_provider IN ('local','gdrive','sharepoint'))
                       NOT NULL DEFAULT 'local',
      storage_config   TEXT NOT NULL DEFAULT '{}',
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      tenant_id   TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      name        TEXT,
      role        TEXT CHECK(role IN ('superadmin','admin','employee'))
                  NOT NULL DEFAULT 'employee',
      google_sub  TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS clients (
      id            TEXT PRIMARY KEY,
      tenant_id     TEXT NOT NULL,
      name          TEXT NOT NULL,
      internal_code TEXT,
      tax_id        TEXT,
      email         TEXT,
      phone         TEXT,
      notes         TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS requests (
      id          TEXT PRIMARY KEY,
      tenant_id   TEXT NOT NULL,
      client_id   TEXT NOT NULL,
      period      TEXT NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('FATT','CUD','BANK','OTHER')),
      status      TEXT NOT NULL CHECK(status IN ('pending','uploaded')) DEFAULT 'pending',
      deadline    DATE,
      notes       TEXT,
      created_by  TEXT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id)  REFERENCES tenants(id)  ON DELETE CASCADE,
      FOREIGN KEY (client_id)  REFERENCES clients(id)  ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL,
      request_id        TEXT NOT NULL,
      uploader_id       TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      stored_filename   TEXT NOT NULL,
      storage_path      TEXT NOT NULL,
      mime_type         TEXT,
      size_bytes        INTEGER,
      created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id)   REFERENCES tenants(id)   ON DELETE CASCADE,
      FOREIGN KEY (request_id)  REFERENCES requests(id)  ON DELETE CASCADE,
      FOREIGN KEY (uploader_id) REFERENCES users(id)     ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id        TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id   TEXT,
      action    TEXT NOT NULL,
      details   TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_tenant       ON users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_clients_tenant     ON clients(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_requests_tenant    ON requests(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_requests_client    ON requests(client_id);
    CREATE INDEX IF NOT EXISTS idx_requests_status    ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_deadline  ON requests(deadline);
    CREATE INDEX IF NOT EXISTS idx_documents_request  ON documents(request_id);
    CREATE INDEX IF NOT EXISTS idx_audit_tenant       ON audit_logs(tenant_id);
  `);
}