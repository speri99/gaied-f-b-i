import { z } from "zod";

export type UserStatus = "Active" | "Inactive";

export type UserRole = "Admin" | "CaseWorker" | "Reader";

export type AuthMethod = "SAML" | "Password";

export interface User {
  userId: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: UserRole;
  status: UserStatus;
  authMethod: AuthMethod;
  smsEnabled: boolean;
  securityProfiles: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  lastLogin?: number;
  themePreference?: 'light'|'dark'|'system';
  metadata?: {
    samlAttributes?: Record<string, string>;
    notes?: string[];
    lastPasswordChange?: number;
    failedLoginAttempts?: number;
    hashedPassword?: string;
    tempPassword?: string;
    mustChangePassword?: boolean;
  };
}

export type CreateUserInput = Omit<
  User,
  "userId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
>;

export type UpdateUserInput = Partial<CreateUserInput>;

export interface UserFilter {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  showDeleted?: boolean;
}

// Type for DynamoDB record format
export interface DynamoDBUser {
  userId: { S: string };
  email: { S: string };
  firstName: { S: string };
  lastName: { S: string };
  phoneNumber: { S: string };
  role: { S: string };
  status: { S: string };
  authMethod: { S: string };
  smsEnabled: { BOOL: boolean };
  securityProfiles: { L: { S: string }[] };
  createdAt: { N: string };
  updatedAt: { N: string };
  lastLogin?: { N: string };
  metadata?: { M: Record<string, any> };
} 