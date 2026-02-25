import { z } from "zod";
import { Permission } from "@/types/security";

// User Schemas
export const userMetadataSchema = z.object({
  phoneNumber: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
  preferences: z.object({
    notifications: z.object({
      email: z.boolean(),
      inApp: z.boolean(),
      desktop: z.boolean(),
    }).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().optional(),
  }).optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
  ),
  profileId: z.string().uuid(),
  metadata: userMetadataSchema.optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  profileId: z.string().uuid().optional(),
  status: z.enum(['Active', 'Inactive', 'Suspended']).optional(),
  metadata: userMetadataSchema.optional(),
});

// Security Profile Schemas
export const createProfileSchema = z.object({
  name: z.string().min(2),
  description: z.string(),
  permissions: z.array(z.string() as z.ZodType<Permission>),
  metadata: z.object({
    createdBy: z.string().uuid(),
    lastModifiedBy: z.string().uuid(),
    notes: z.string().optional(),
  }).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string() as z.ZodType<Permission>).optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
  metadata: z.object({
    lastModifiedBy: z.string().uuid(),
    notes: z.string().optional(),
  }).optional(),
});

// Case Schemas
export const caseMetadataSchema = z.object({
  caseType: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  description: z.string().optional(),
  notes: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    caseType: z.string(),
    url: z.string(),
    uploadedBy: z.string().uuid(),
    uploadedAt: z.number(),
    size: z.number(),
  })).optional(),
  timeline: z.array(z.object({
    id: z.string().uuid(),
    eventType: z.string(),
    title: z.string(),
    description: z.string(),
    timestamp: z.number(),
    createdBy: z.string().uuid(),
    metadata: z.record(z.unknown()).optional(),
  })).optional(),
});

export const partialCaseMetadataSchema = caseMetadataSchema.partial();

export const createCaseSchema = z.object({
  tenantId: z.string().optional(),
  Identifier: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  VictimPhone: z.string().min(1, "Primary phone is required"),
  secondaryPhone: z.string().optional(),
  CaseManager: z.string().min(1, "Case manager is required"),
  CaseManagerEmail: z.string().email("Invalid email").min(1, "Case manager email is required"),
  CaseManagerPhone: z.string().min(1, "Case manager phone is required"),
  BackupCaseManager: z.string().optional(),
  BackupCaseManagerEmail: z.string().email("Invalid email").optional(),
  BackupCaseManagerPhone: z.string().optional(),
  status: z.enum(["Active", "Pending", "Closed"]),
  caseType: z.enum(["Child Abuse", "Domestic Violence", "Elder Abuse"]),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  ReportedAbuser: z.string().optional(),
  notes: z.string().optional(),
  smsNotifications: z.boolean().optional(),
  backupSmsNotifications: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  contactMethods: z.array(z.enum(["email", "phone", "text"])).optional(),
  websiteTemplateId: z.string().min(1, "Website template is required"),
  workflowId:z.string().min(1,"Workflow is required"),
  metadata: z.object({
    caseType: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    description: z.string(),
    notes: z.array(z.string()),
  }),
});

export const updateCaseSchema = createCaseSchema.partial();

// Location Schemas
export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  formattedAddress: z.string(),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
  provider: z.string().optional(),
});

export const createLocationSchema = z.object({
  UUID: z.string().uuid(),
  location: locationSchema,
});

export const updateLocationSchema = z.object({
  location: locationSchema,
}); 