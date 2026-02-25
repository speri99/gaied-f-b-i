import { z } from "zod";

const baseUserSchema = {
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  authMethod: z.enum(["SAML", "Password"]),
  smsEnabled: z.boolean().default(false),
  phoneNumber: z.string().optional(),
  securityProfiles: z.array(z.string()).min(1, "At least one security profile is required"),
};

export const createUserSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  ...baseUserSchema,
});

export const updateUserSchema = z.object({
  ...Object.fromEntries(
    Object.entries(baseUserSchema).map(([key, value]) => [
      key,
      value.optional(),
    ])
  ),
  password: z.string().optional(),
}); 