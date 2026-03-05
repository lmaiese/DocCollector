import { db } from './index.pg.ts';
import { tenants, users, clients, documentTypes, requestTemplates } from './schema.pg.ts';

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

  await db.insert(clients).values([
    { tenantId: tenant.id, name: 'Acme S.r.l.', internalCode: 'ACM001',
      taxId: '12345678901', email: 'contabilita@acme.it', category: 'SRL' },
    { tenantId: tenant.id, name: 'Beta S.p.A.', internalCode: 'BET002',
      taxId: '98765432100', email: 'info@beta.it', category: 'SPA' },
  ]);

  // Catalogo tipi documentali di sistema
  await db.insert(documentTypes).values([
    { code: 'FATT_ATT',   label: 'Fatture Attive',              category: 'Contabile',  isSystem: true, sortOrder: 10 },
    { code: 'FATT_PAS',   label: 'Fatture Passive',             category: 'Contabile',  isSystem: true, sortOrder: 20 },
    { code: 'BANK',       label: 'Estratto Conto Bancario',     category: 'Contabile',  isSystem: true, sortOrder: 30 },
    { code: 'F24',        label: 'F24 e Deleghe di Pagamento',  category: 'Fiscale',    isSystem: true, sortOrder: 40 },
    { code: 'IVA_TRIM',   label: 'Liquidazione IVA Trimestrale',category: 'Fiscale',    isSystem: true, sortOrder: 50 },
    { code: 'MOD_730',    label: 'Modello 730',                 category: 'Fiscale',    isSystem: true, sortOrder: 60 },
    { code: 'REDDITI_PF', label: 'Dichiarazione Redditi PF',   category: 'Fiscale',    isSystem: true, sortOrder: 70 },
    { code: 'REDDITI_SC', label: 'Dichiarazione Redditi SC',   category: 'Fiscale',    isSystem: true, sortOrder: 80 },
    { code: 'IRAP',       label: 'Dichiarazione IRAP',          category: 'Fiscale',    isSystem: true, sortOrder: 90 },
    { code: 'MOD_770',    label: 'Modello 770',                 category: 'Fiscale',    isSystem: true, sortOrder: 100 },
    { code: 'BILANCIO',   label: 'Bilancio Civilistico',        category: 'Contabile',  isSystem: true, sortOrder: 110 },
    { code: 'LIB_GIO',    label: 'Libro Giornale',              category: 'Contabile',  isSystem: true, sortOrder: 120 },
    { code: 'REG_IVA',    label: 'Registro IVA',                category: 'Contabile',  isSystem: true, sortOrder: 130 },
    { code: 'CUD',        label: 'CUD / Certificazione Unica',  category: 'Paghe',      isSystem: true, sortOrder: 140 },
    { code: 'BUSTA_PAGA', label: 'Buste Paga',                  category: 'Paghe',      isSystem: true, sortOrder: 150 },
    { code: 'LUL',        label: 'Libro Unico del Lavoro',      category: 'Paghe',      isSystem: true, sortOrder: 160 },
    { code: 'VISURA',     label: 'Visura Camerale',             category: 'Societario', isSystem: true, sortOrder: 170 },
    { code: 'STATUTO',    label: 'Statuto Societario',          category: 'Societario', isSystem: true, sortOrder: 180 },
    { code: 'VERBALE',    label: 'Verbali CdA / Assemblea',     category: 'Societario', isSystem: true, sortOrder: 190 },
    { code: 'CONTRATTO',  label: 'Contratti',                   category: 'Societario', isSystem: true, sortOrder: 200 },
    { code: 'OTHER',      label: 'Altro',                       category: 'Altro',      isSystem: true, sortOrder: 999 },
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
        { docTypeCode: 'VISURA',   deadlineDaysOffset: 7 },
        { docTypeCode: 'STATUTO',  deadlineDaysOffset: 7 },
        { docTypeCode: 'CONTRATTO',deadlineDaysOffset: 14 },
      ],
    },
  ]);

  console.log('[DB] Seeding complete.');
}