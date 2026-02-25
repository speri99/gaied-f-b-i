export type OrganizationType = 'nonprofit' | 'forprofit' | 'government' | 'education';
export type BillingType = 'invoice' | 'credit_card';
export type ContactMethod = 'email' | 'phone';

export interface Organization {
  id: string;
  tenantId: string;
  tenantName: string;
  subdomain: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  billingContactName: string;
  billingContactEmail: string;
  staffSize: number;
  type: OrganizationType;
  jurisdiction: string;
  region: string;
  state: string;
  preferredContactMethod: ContactMethod;
  website: string;
  billingType: BillingType;
  stripeCustomerId?: string;
  status: 'Active' | 'Inactive' | 'Pending';
  createdAt: string;
  updatedAt: string;
  termsAccepted: boolean;
  termsAcceptedAt?: string;
}

export interface CreateOrganizationInput {
  name: string;
  subdomain: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  billingContactName: string;
  billingContactEmail: string;
  staffSize: number;
  type: OrganizationType;
  jurisdiction: string;
  region: string;
  state: string;
  preferredContactMethod: ContactMethod;
  website: string;
  billingType: BillingType;
  termsAccepted: boolean;
} 