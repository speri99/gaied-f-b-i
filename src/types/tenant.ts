export interface Tenant {
  tenantId: string;
  name: string;
  smsPhoneNumber: string;
  contactName: string;
  contactPhoneNumber: string;
  createdAt: string;
  updatedAt: string;
  status: 'Active' | 'Inactive';
} 