import { z } from "zod";

export type Permission = "none" | "read" | "write";

export interface SectionPermissions {
  users: Permission;
  cases: Permission;
  contacts: Permission;
  locations: Permission;
  reports: Permission;
  securityProfiles: Permission;
  websiteTemplates: Permission;
  notes: Permission;
}

export interface SecurityProfile {
  profileId: string;
  tenantId: string;
  name: string;
  description: string;
  status: "Active" | "Inactive";
  permissions: SectionPermissions;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export type CreateSecurityProfileInput = Omit<
  SecurityProfile,
  "profileId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
>;

export type UpdateSecurityProfileInput = Partial<Omit<SecurityProfile, "profileId" | "tenantId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">>;

export interface SecurityProfileFilter {
  status?: ("Active" | "Inactive")[];
  search?: string;
  tags?: string[];
} 