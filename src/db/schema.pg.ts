/**
 * DocCollector+ — PostgreSQL Schema (Sprint 0)
 * ORM: Drizzle ORM  |  DB: PostgreSQL 15+
 * Gerarchia: Tenant → User/Client → Practice → Request → Document
 */
import {
  pgTable, pgEnum, text, integer, boolean,
  timestamp, date, jsonb, uuid, uniqueIndex, index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ─────────────────────────────────────────────────────────────────
export const storageProviderEnum  = pgEnum('storage_provider', ['local','gdrive','sharepoint']);
export const userRoleEnum         = pgEnum('user_role', ['superadmin','admin','employee','client']);
export const requestStatusEnum    = pgEnum('request_status', [
  'pending','uploaded','under_review','approved','rejected',
]);
export const practiceStatusEnum   = pgEnum('practice_status', [
  'open','in_progress','completed','delivered','archived',
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'request_created','document_uploaded','document_approved',
  'document_rejected','deadline_reminder','magic_link','document_shared',
]);
export const notifStatusEnum   = pgEnum('notification_status', ['pending','sent','failed']);
export const docDirectionEnum  = pgEnum('doc_direction', ['client_to_studio','studio_to_client']);

// ─── Tenants ───────────────────────────────────────────────────────────────
export const tenants = pgTable('tenants', {
  id:               uuid('id').primaryKey().defaultRandom(),
  name:             text('name').notNull(),
  slug:             text('slug').notNull().unique(),
  storageProvider:  storageProviderEnum('storage_provider').notNull().default('local'),
  storageConfig:    jsonb('storage_config').notNull().default({}),
  logoUrl:          text('logo_url'),
  primaryColor:     text('primary_color').default('#4f46e5'),
  emailFrom:        text('email_from'),
  emailSignature:   text('email_signature'),
  retentionYears:   integer('retention_years').default(10),
  stripeCustomerId: text('stripe_customer_id'),
  stripePlanId:     text('stripe_plan_id'),
  isActive:         boolean('is_active').notNull().default(true),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  updatedAt:        timestamp('updated_at').notNull().defaultNow(),
});

// ─── Clients ───────────────────────────────────────────────────────────────
export const clients = pgTable('clients', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:         text('name').notNull(),
  internalCode: text('internal_code'),
  taxId:        text('tax_id'),
  email:        text('email'),
  phone:        text('phone'),
  notes:        text('notes'),
  category:     text('category'),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('clients_tenant_idx').on(t.tenantId),
  taxIdIdx:  index('clients_tax_id_idx').on(t.taxId),
}));

// ─── Users ─────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email:       text('email').notNull().unique(),
  name:        text('name'),
  role:        userRoleEnum('role').notNull().default('employee'),
  clientId:    uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  googleSub:   text('google_sub'),
  isActive:    boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  emailIdx:  uniqueIndex('users_email_idx').on(t.email),
  tenantIdx: index('users_tenant_idx').on(t.tenantId),
  clientIdx: index('users_client_idx').on(t.clientId),
}));

// ─── Document Types ────────────────────────────────────────────────────────
export const documentTypes = pgTable('document_types', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  code:        text('code').notNull(),
  label:       text('label').notNull(),
  description: text('description'),
  category:    text('category'),
  isSystem:    boolean('is_system').notNull().default(false),
  isActive:    boolean('is_active').notNull().default(true),
  sortOrder:   integer('sort_order').default(0),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tenantCodeIdx: uniqueIndex('doc_types_tenant_code_idx').on(t.tenantId, t.code),
}));

// ─── Practices ─────────────────────────────────────────────────────────────
export const practices = pgTable('practices', {
  id:              uuid('id').primaryKey().defaultRandom(),
  tenantId:        uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId:        uuid('client_id').notNull().references(() => clients.id, { onDelete: 'restrict' }),
  title:           text('title').notNull(),
  type:            text('type'),
  fiscalYear:      integer('fiscal_year'),
  status:          practiceStatusEnum('status').notNull().default('open'),
  assignedTo:      uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  deadline:        date('deadline'),
  notes:           text('notes'),
  visibleToClient: boolean('visible_to_client').notNull().default(true),
  createdBy:       uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:   index('practices_tenant_idx').on(t.tenantId),
  clientIdx:   index('practices_client_idx').on(t.clientId),
  statusIdx:   index('practices_status_idx').on(t.status),
  deadlineIdx: index('practices_deadline_idx').on(t.deadline),
}));

// ─── Request Templates ─────────────────────────────────────────────────────
export const requestTemplates = pgTable('request_templates', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  isSystem:    boolean('is_system').notNull().default(false),
  items:       jsonb('items').notNull().default([]),
  autoSend:    boolean('auto_send').notNull().default(false),
  cronExpr:    text('cron_expr'),
  isActive:    boolean('is_active').notNull().default(true),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
});

// ─── Requests ──────────────────────────────────────────────────────────────
export const requests = pgTable('requests', {
  id:              uuid('id').primaryKey().defaultRandom(),
  tenantId:        uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId:        uuid('client_id').notNull().references(() => clients.id, { onDelete: 'restrict' }),
  practiceId:      uuid('practice_id').references(() => practices.id, { onDelete: 'set null' }),
  docTypeCode:     text('doc_type_code').notNull(),
  period:          text('period').notNull(),
  status:          requestStatusEnum('status').notNull().default('pending'),
  deadline:        date('deadline'),
  notes:           text('notes'),
  reviewedBy:      uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt:      timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  campaignId:      uuid('campaign_id'),
  createdBy:       uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:   index('requests_tenant_idx').on(t.tenantId),
  clientIdx:   index('requests_client_idx').on(t.clientId),
  practiceIdx: index('requests_practice_idx').on(t.practiceId),
  statusIdx:   index('requests_status_idx').on(t.status),
  deadlineIdx: index('requests_deadline_idx').on(t.deadline),
  campaignIdx: index('requests_campaign_idx').on(t.campaignId),
}));

// ─── Documents ─────────────────────────────────────────────────────────────
export const documents = pgTable('documents', {
  id:               uuid('id').primaryKey().defaultRandom(),
  tenantId:         uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  requestId:        uuid('request_id').references(() => requests.id, { onDelete: 'cascade' }),
  uploaderId:       uuid('uploader_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  direction:        docDirectionEnum('direction').notNull().default('client_to_studio'),
  originalFilename: text('original_filename').notNull(),
  storedFilename:   text('stored_filename').notNull(),
  storagePath:      text('storage_path').notNull(),
  mimeType:         text('mime_type'),
  sizeBytes:        integer('size_bytes'),
  isEncrypted:      boolean('is_encrypted').notNull().default(true),
  encryptionKeyId:  text('encryption_key_id'),
  retentionUntil:   date('retention_until'),
  isArchived:       boolean('is_archived').notNull().default(false),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:  index('documents_tenant_idx').on(t.tenantId),
  requestIdx: index('documents_request_idx').on(t.requestId),
}));

// ─── Request Comments ──────────────────────────────────────────────────────
export const requestComments = pgTable('request_comments', {
  id:              uuid('id').primaryKey().defaultRandom(),
  tenantId:        uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  requestId:       uuid('request_id').notNull().references(() => requests.id, { onDelete: 'cascade' }),
  authorId:        uuid('author_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  body:            text('body').notNull(),
  visibleToClient: boolean('visible_to_client').notNull().default(true),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
}, (t) => ({ requestIdx: index('comments_request_idx').on(t.requestId) }));

// ─── Client Tokens (magic link) ────────────────────────────────────────────
export const clientTokens = pgTable('client_tokens', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token:     text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt:    timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({ tokenIdx: uniqueIndex('client_tokens_token_idx').on(t.token) }));

// ─── Notifications ─────────────────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId:     uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type:       notificationTypeEnum('type').notNull(),
  status:     notifStatusEnum('status').notNull().default('pending'),
  toEmail:    text('to_email').notNull(),
  subject:    text('subject').notNull(),
  bodyHtml:   text('body_html').notNull(),
  refType:    text('ref_type'),
  refId:      uuid('ref_id'),
  sentAt:     timestamp('sent_at'),
  failReason: text('fail_reason'),
  attempts:   integer('attempts').notNull().default(0),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('notifications_status_idx').on(t.status),
  tenantIdx: index('notifications_tenant_idx').on(t.tenantId),
}));

// ─── Audit Logs ────────────────────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action:    text('action').notNull(),
  details:   text('details'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:    index('audit_tenant_idx').on(t.tenantId),
  timestampIdx: index('audit_timestamp_idx').on(t.timestamp),
}));

// ─── Relations ─────────────────────────────────────────────────────────────
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users), clients: many(clients),
  practices: many(practices), requests: many(requests),
}));
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  client: one(clients, { fields: [users.clientId], references: [clients.id] }),
  comments: many(requestComments), tokens: many(clientTokens),
}));
export const clientsRelations = relations(clients, ({ one, many }) => ({
  tenant: one(tenants, { fields: [clients.tenantId], references: [tenants.id] }),
  practices: many(practices), requests: many(requests), users: many(users),
}));
export const practicesRelations = relations(practices, ({ one, many }) => ({
  tenant: one(tenants, { fields: [practices.tenantId], references: [tenants.id] }),
  client: one(clients, { fields: [practices.clientId], references: [clients.id] }),
  requests: many(requests),
}));
export const requestsRelations = relations(requests, ({ one, many }) => ({
  tenant:    one(tenants,   { fields: [requests.tenantId],   references: [tenants.id] }),
  client:    one(clients,   { fields: [requests.clientId],   references: [clients.id] }),
  practice:  one(practices, { fields: [requests.practiceId], references: [practices.id] }),
  documents: many(documents), comments: many(requestComments),
}));
export const documentsRelations = relations(documents, ({ one }) => ({
  tenant:   one(tenants,  { fields: [documents.tenantId],  references: [tenants.id] }),
  request:  one(requests, { fields: [documents.requestId], references: [requests.id] }),
  uploader: one(users,    { fields: [documents.uploaderId], references: [users.id] }),
}));