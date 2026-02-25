import { z } from "zod";

const permissionSchema = z.enum(["none", "read", "write"]);

const sectionPermissionsSchema = z.object({
  users: permissionSchema,
  cases: permissionSchema,
  contacts: permissionSchema,
  locations: permissionSchema,
  reports: permissionSchema,
  securityProfiles: permissionSchema,
  deletedItems: permissionSchema,
  websiteTemplates: permissionSchema,
  notes: permissionSchema,
});

export const createSecurityProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  permissions: sectionPermissionsSchema,
  tags: z.array(z.string()).default([]),
});

export const updateSecurityProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less"),
  status: z.enum(["Active", "Inactive"]),
  permissions: sectionPermissionsSchema,
  tags: z.array(z.string()),
}); 