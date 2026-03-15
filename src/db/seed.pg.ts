import { db } from './index.pg.ts';
import {
  tenants, users, clients, documentTypes,
  requestTemplates, requests, practices,
} from './schema.pg.ts';
import { eq } from 'drizzle-orm';

export async function seedDb(): Promise<void> {
  const existing = await db.select().from(tenants).limit(1);
  if (existing.length > 0) return;

  console.log('[DB] Seeding...');

  const [tenant] = await db.insert(tenants).values({
    name: 'Studio Demo Rossi & Associati',
    slug: 'studio-demo',
    primaryColor: '#4f46e5',
    retentionYears: 10,
  }).returning();

  const [admin] = await db.insert(users).values({
    tenantId: tenant.id, email: 'admin@studiodemo.com',
    name: 'Mario Rossi', role: 'admin',
  }).returning();

  await db.insert(users).values([
    { tenantId: tenant.id, email: 'superadmin@doccollector.com',
      name: 'Super Admin', role: 'superadmin' },
    { tenantId: tenant.id, email: 'dipendente@studiodemo.com',
      name: 'Luigi Bianchi', role: 'employee' },
  ]);

  // Clienti
  const [acme] = await db.insert(clients).values({
    tenantId: tenant.id, name: 'Acme S.r.l.', internalCode: 'ACM001',
    taxId: '12345678901', email: 'contabilita@acme.it', category: 'SRL',
  }).returning();

  const [beta] = await db.insert(clients).values({
    tenantId: tenant.id, name: 'Beta S.p.A.', internalCode: 'BET002',
    taxId: '98765432100', email: 'info@beta.it', category: 'SPA',
  }).returning();

  // Utenti cliente per test portale
  const [clientUserAcme] = await db.insert(users).values({
    tenantId: tenant.id,
    email:    'cliente@acme.it',
    name:     'Giuseppe Acme',
    role:     'client',
    clientId: acme.id,
    isActive: true,
  }).returning();

  const [clientUserBeta] = await db.insert(users).values({
    tenantId: tenant.id,
    email:    'cliente@beta.it',
    name:     'Carla Beta',
    role:     'client',
    clientId: beta.id,
    isActive: true,
  }).returning();

  // Catalogo tipi documentali di sistema
  await db.insert(documentTypes).values([
    { code: 'FATT_ATT',   label: 'Fatture Attive',               category: 'Contabile',  isSystem: true, sortOrder: 10 },
    { code: 'FATT_PAS',   label: 'Fatture Passive',              category: 'Contabile',  isSystem: true, sortOrder: 20 },
    { code: 'BANK',       label: 'Estratto Conto Bancario',      category: 'Contabile',  isSystem: true, sortOrder: 30 },
    { code: 'F24',        label: 'F24 e Deleghe di Pagamento',   category: 'Fiscale',    isSystem: true, sortOrder: 40 },
    { code: 'IVA_TRIM',   label: 'Liquidazione IVA Trimestrale', category: 'Fiscale',    isSystem: true, sortOrder: 50 },
    { code: 'MOD_730',    label: 'Modello 730',                  category: 'Fiscale',    isSystem: true, sortOrder: 60 },
    { code: 'REDDITI_PF', label: 'Dichiarazione Redditi PF',    category: 'Fiscale',    isSystem: true, sortOrder: 70 },
    { code: 'REDDITI_SC', label: 'Dichiarazione Redditi SC',    category: 'Fiscale',    isSystem: true, sortOrder: 80 },
    { code: 'IRAP',       label: 'Dichiarazione IRAP',           category: 'Fiscale',    isSystem: true, sortOrder: 90 },
    { code: 'MOD_770',    label: 'Modello 770',                  category: 'Fiscale',    isSystem: true, sortOrder: 100 },
    { code: 'BILANCIO',   label: 'Bilancio Civilistico',         category: 'Contabile',  isSystem: true, sortOrder: 110 },
    { code: 'LIB_GIO',    label: 'Libro Giornale',               category: 'Contabile',  isSystem: true, sortOrder: 120 },
    { code: 'REG_IVA',    label: 'Registro IVA',                 category: 'Contabile',  isSystem: true, sortOrder: 130 },
    { code: 'CUD',        label: 'CUD / Certificazione Unica',   category: 'Paghe',      isSystem: true, sortOrder: 140 },
    { code: 'BUSTA_PAGA', label: 'Buste Paga',                   category: 'Paghe',      isSystem: true, sortOrder: 150 },
    { code: 'LUL',        label: 'Libro Unico del Lavoro',       category: 'Paghe',      isSystem: true, sortOrder: 160 },
    { code: 'VISURA',     label: 'Visura Camerale',              category: 'Societario', isSystem: true, sortOrder: 170 },
    { code: 'STATUTO',    label: 'Statuto Societario',           category: 'Societario', isSystem: true, sortOrder: 180 },
    { code: 'VERBALE',    label: 'Verbali CdA / Assemblea',      category: 'Societario', isSystem: true, sortOrder: 190 },
    { code: 'CONTRATTO',  label: 'Contratti',                    category: 'Societario', isSystem: true, sortOrder: 200 },
    { code: 'OTHER',      label: 'Altro',                        category: 'Altro',      isSystem: true, sortOrder: 999 },
  ]);

  // Template di sistema
  await db.insert(requestTemplates).values([
    {
      name: 'Pacchetto Mensile IVA',
      description: 'Fatture attive, passive ed estratto conto',
      isSystem: true,
      items: [
        { docTypeCode: 'FATT_ATT', deadlineDaysOffset: 15 },
        { docTypeCode: 'FATT_PAS', deadlineDaysOffset: 15 },
        { docTypeCode: 'BANK',     deadlineDaysOffset: 15 },
      ],
    },
    {
      name: 'Dichiarazione Annuale SC',
      description: 'Documenti per dichiarazione societaria',
      isSystem: true,
      items: [
        { docTypeCode: 'BILANCIO',   deadlineDaysOffset: 60 },
        { docTypeCode: 'REDDITI_SC', deadlineDaysOffset: 60 },
        { docTypeCode: 'IRAP',       deadlineDaysOffset: 60 },
        { docTypeCode: 'MOD_770',    deadlineDaysOffset: 60 },
      ],
    },
    {
      name: 'Onboarding Nuovo Cliente',
      description: 'Documenti iniziali per ogni nuovo cliente',
      isSystem: true,
      items: [
        { docTypeCode: 'VISURA',    deadlineDaysOffset: 7 },
        { docTypeCode: 'STATUTO',   deadlineDaysOffset: 7 },
        { docTypeCode: 'CONTRATTO', deadlineDaysOffset: 14 },
      ],
    },
  ]);

  // ─── PRATICHE E RICHIESTE DEMO ────────────────────────────────────────────
  // Necessarie per testare il portale cliente senza dover creare dati manualmente

  const today      = new Date();
  const in7days    = new Date(today); in7days.setDate(today.getDate() + 7);
  const in3days    = new Date(today); in3days.setDate(today.getDate() + 3);
  const yesterday  = new Date(today); yesterday.setDate(today.getDate() - 1);
  const lastMonth  = new Date(today); lastMonth.setDate(today.getDate() - 30);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  // Pratica demo per Acme
  const [practiceAcme] = await db.insert(practices).values({
    tenantId:        tenant.id,
    clientId:        acme.id,
    title:           'Dichiarazione IVA Marzo 2025',
    type:            'iva_mensile',
    fiscalYear:      2025,
    status:          'open',
    deadline:        formatDate(in7days),
    visibleToClient: true,
    createdBy:       admin.id,
  }).returning();

  // Richieste demo collegate alla pratica Acme
  await db.insert(requests).values([
    {
      tenantId:    tenant.id,
      clientId:    acme.id,
      practiceId:  practiceAcme.id,
      docTypeCode: 'FATT_ATT',
      period:      '202503',
      status:      'pending',
      deadline:    formatDate(in7days),
      notes:       'Includere tutte le fatture elettroniche del mese',
      createdBy:   admin.id,
    },
    {
      tenantId:    tenant.id,
      clientId:    acme.id,
      practiceId:  practiceAcme.id,
      docTypeCode: 'FATT_PAS',
      period:      '202503',
      status:      'pending',
      deadline:    formatDate(in3days),
      createdBy:   admin.id,
    },
    {
      tenantId:    tenant.id,
      clientId:    acme.id,
      practiceId:  practiceAcme.id,
      docTypeCode: 'BANK',
      period:      '202503',
      status:      'pending',
      deadline:    formatDate(yesterday),
      notes:       'Estratto conto di marzo — URGENTE',
      createdBy:   admin.id,
    },
  ]);

  // Richiesta scaduta senza pratica (per testare il badge scaduto)
  await db.insert(requests).values({
    tenantId:    tenant.id,
    clientId:    acme.id,
    docTypeCode: 'F24',
    period:      '202502',
    status:      'pending',
    deadline:    formatDate(lastMonth),
    notes:       'F24 febbraio — in ritardo',
    createdBy:   admin.id,
  });

  // Richiesta per Beta (senza pratica)
  await db.insert(requests).values([
    {
      tenantId:    tenant.id,
      clientId:    beta.id,
      docTypeCode: 'BILANCIO',
      period:      '202412',
      status:      'pending',
      deadline:    formatDate(in7days),
      createdBy:   admin.id,
    },
    {
      tenantId:    tenant.id,
      clientId:    beta.id,
      docTypeCode: 'REDDITI_SC',
      period:      '202412',
      status:      'pending',
      deadline:    formatDate(in7days),
      createdBy:   admin.id,
    },
  ]);

  console.log('[DB] Seeding complete.');
  console.log('[DB] Staff:   admin@studiodemo.com | dipendente@studiodemo.com');
  console.log('[DB] Portale: cliente@acme.it | cliente@beta.it → POST /api/auth/magic-link');
}