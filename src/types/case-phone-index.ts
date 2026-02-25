export interface CasePhoneIndex {
  tenantId: string;
  phoneNumber: string;
  caseId: string;
  createdAt: string;
  updatedAt: string;
  isPrimary: boolean;
  label?: string; // Optional label like "Home", "Work", "Mobile", etc.
} 