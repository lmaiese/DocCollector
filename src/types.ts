export type StorageProvider = 'local' | 'gdrive' | 'sharepoint';
export type UserRole        = 'superadmin' | 'admin' | 'employee' | 'client';
export type RequestStatus   = 'pending' | 'uploaded' | 'under_review' | 'approved' | 'rejected';
export type PracticeStatus  = 'open' | 'in_progress' | 'completed' | 'delivered' | 'archived';

export interface Tenant {
  id: string; name: string; slug: string;
  storageProvider: StorageProvider;
  logoUrl?: string | null; primaryColor?: string | null;
  emailFrom?: string | null; emailSignature?: string | null;
  retentionYears?: number | null;
  isActive: boolean; createdAt: string;
}

export interface User {
  id: string; tenantId: string; email: string; name?: string | null;
  role: UserRole; clientId?: string | null; isActive: boolean; createdAt: string;
  // snake_case aliases usati dal frontend (retrocompatibilità)
  tenant_id?: string; client_id?: string | null;
}

export interface Client {
  id: string; tenantId: string; name: string;
  internalCode?: string | null; taxId?: string | null;
  email?: string | null; phone?: string | null;
  notes?: string | null; category?: string | null;
  isActive: boolean; createdAt: string;
  // snake_case aliases
  tenant_id?: string; internal_code?: string | null; tax_id?: string | null;
}

export interface DocumentType {
  id: string; tenantId?: string | null; code: string; label: string;
  description?: string | null; category?: string | null;
  isSystem: boolean; isActive: boolean; sortOrder?: number | null;
}

export interface Practice {
  id: string; tenantId: string; clientId: string; title: string;
  type?: string | null; fiscalYear?: number | null;
  status: PracticeStatus; assignedTo?: string | null;
  deadline?: string | null; notes?: string | null;
  visibleToClient: boolean; createdAt: string; updatedAt: string;
  // arricchimento join
  clientName?: string; assigneeName?: string | null;
  requestCount?: number; approvedCount?: number;
  pendingCount?: number; rejectedCount?: number; progress?: number;
}

export interface Request {
  id: string; tenantId?: string; clientId: string; period: string;
  docTypeCode: string; status: RequestStatus;
  deadline?: string | null; notes?: string | null;
  rejectionReason?: string | null; practiceId?: string | null;
  campaignId?: string | null; createdAt: string; updatedAt: string;
  // arricchimento join
  clientName?: string; docTypeLabel?: string | null;
  documentId?: string | null; documentFilename?: string | null;
  // snake_case aliases legacy
  client_id?: string; doc_type_code?: string; type?: string;
}

export interface Document {
  id: string; tenantId: string; requestId?: string | null;
  uploaderId: string; direction: 'client_to_studio' | 'studio_to_client';
  originalFilename: string; storedFilename: string; storagePath: string;
  mimeType?: string | null; sizeBytes?: number | null;
  isEncrypted: boolean; isArchived: boolean; createdAt: string;
}

export interface AuditLog {
  id: string; tenantId: string; userId?: string | null;
  action: string; details?: string | null; timestamp: string;
  user_name?: string | null;
}

export interface DashboardStats {
  pendingRequests: number; uploadedDocs: number; missingDocs: number;
  expiringThisWeek: number; overdueRequests: number;
  chartData: { date: string; count: number }[];
  isSuperAdmin?: boolean;
}

export interface Comment {
  id: string; body: string; visibleToClient: boolean;
  createdAt: string; authorId: string;
  authorName?: string | null; authorRole?: string | null;
}