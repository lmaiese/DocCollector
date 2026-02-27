export interface Tenant {
  id: string;
  name: string;
  storage_provider: 'local' | 'drive' | 'sharepoint';
  storage_config: string; // JSON string
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'client';
  created_at: string;
}

export interface Client {
  id: string;
  tenant_id: string;
  name: string;
  internal_code: string;
  tax_id: string;
  created_at: string;
}

export interface Request {
  id: string;
  tenant_id: string;
  client_id: string;
  period: string; // YYYYMM
  type: string; // FATT, CUD, ECC
  status: 'pending' | 'uploaded';
  created_at: string;
  client_name?: string; // joined
}

export interface Document {
  id: string;
  tenant_id: string;
  request_id: string;
  filename: string;
  original_filename: string;
  path: string;
  uploaded_at: string;
  uploaded_by: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  details: string;
  timestamp: string;
  user_name?: string; // joined
}
