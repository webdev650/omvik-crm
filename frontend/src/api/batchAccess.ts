import api from './axios.js';

export interface AccessibleBatch {
  batchId: string;
  batchName: string;
  leadCount: number;
  lastImportedAt: string;
  project?: { _id: string; name: string; code: string } | null;
  isPrivate: boolean;
  accessLevel: 'view' | 'edit' | 'manage';
  assignedTo: any[];
  grantedBy?: any;
  grantedAt?: string;
}

export async function getMyAccessibleBatches(): Promise<{ success: boolean; count: number; batches: AccessibleBatch[] }> {
  const response = await api.get('/my-accessible-batches');
  return response.data;
}

export async function createBatchAccess(data: {
  batchId: string;
  assignedTo: string | string[];
  accessLevel?: 'view' | 'edit' | 'manage';
  expiresAt?: string | null;
}) {
  const response = await api.post('/batch-access', data);
  return response.data;
}

export async function revokeBatchAccess(idOrBatchId: string) {
  const response = await api.delete(`/batch-access/${encodeURIComponent(idOrBatchId)}`);
  return response.data;
}

export async function getAllBatchAccess() {
  const response = await api.get('/batch-access');
  return response.data;
}
