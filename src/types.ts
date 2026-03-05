export type StorageProvider = 'local' | 'gdrive' | 'sharepoint';
export type UserRole        = 'superadmin' | 'admin' | 'employee';
export type RequestStatus = 'pending' | 'uploaded' | 'under_review' | 'approved' | 'rejected';
export type RequestType     = 'FATT' | 'CUD' | 'BANK' | 'OTHER';

export interface Tenant {
  id: string; name: string; storage_provider: StorageProvider;
  storage_config: string; created_at: string;
}
export interface User {
  id: string; tenant_id: string; email: string; name: string;
  role: UserRole; google_sub?: string; created_at: string;
}
export interface Client {
  id: string; tenant_id: string; name: string; internal_code?: string;
  tax_id?: string; email?: string; phone?: string; notes?: string; created_at: string;
}
export interface Request {
  id: string; tenant_id: string; client_id: string; period: string;
  type: RequestType; status: RequestStatus; deadline?: string | null;
  notes?: string; created_by: string; created_at: string;
  client_name?: string; document_id?: string; document_filename?: string;
}
export interface Document {
  id: string; tenant_id: string; request_id: string; uploader_id: string;
  original_filename: string; stored_filename: string; storage_path: string;
  mime_type?: string; size_bytes?: number; created_at: string;
}
export interface AuditLog {
  id: string; tenant_id: string; user_id?: string; action: string;
  details?: string; timestamp: string; user_name?: string;
}
export interface DashboardStats {
  pendingRequests: number; uploadedDocs: number; missingDocs: number;
  expiringThisWeek: number; overdueRequests: number;
  chartData: { date: string; count: number }[];
  isSuperAdmin?: boolean;
}
