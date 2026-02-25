export interface SecurityProfile {
  profileId: string;
  name: string;
  description: string;
  permissions: Permission[];
  status: ProfileStatus;
  createdAt: number;
  updatedAt: number;
  metadata: ProfileMetadata;
}

export type ProfileStatus = 'Active' | 'Inactive';

export type Permission =
  | 'read:cases'
  | 'write:cases'
  | 'delete:cases'
  | 'read:contacts'
  | 'write:contacts'
  | 'delete:contacts'
  | 'read:locations'
  | 'write:locations'
  | 'manage:users'
  | 'manage:profiles'
  | 'view:analytics'
  | 'export:data';

export interface ProfileMetadata {
  createdBy: string; // UUID of creator
  lastModifiedBy: string; // UUID of last modifier
  version: number;
  notes?: string;
}

export interface CreateProfileInput {
  name: string;
  description: string;
  permissions: Permission[];
  metadata?: Omit<ProfileMetadata, 'version'>;
}

export interface UpdateProfileInput {
  name?: string;
  description?: string;
  permissions?: Permission[];
  status?: ProfileStatus;
  metadata?: Partial<ProfileMetadata>;
}

export interface PermissionCheck {
  userId: string;
  requiredPermissions: Permission[];
  resourceId?: string;
} 