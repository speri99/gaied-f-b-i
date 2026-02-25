import { z } from "zod";
import { OrganizationType, BillingType, ContactMethod } from "@/types/organization";

export const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  subdomain: z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .max(63, "Subdomain must be less than 63 characters")
    .regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens"),
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  contactEmail: z.string().email("Invalid email address"),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  contactPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  billingContactName: z.string().min(2, "Billing contact name must be at least 2 characters"),
  billingContactEmail: z.string().email("Invalid email address"),
  staffSize: z.number().min(1, "Staff size must be at least 1"),
  type: z.enum(["nonprofit", "forprofit", "government", "education"]),
  jurisdiction: z.enum(["federal", "state", "local", "international"]),
  region: z.string().optional(),
  state: z.string().optional(),
  preferredContactMethod: z.enum(["email", "phone"]).optional().default("email"),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  billingType: z.enum(["invoice", "credit_card"]),
  termsAccepted: z.boolean().refine((val) => val === true, "Terms must be accepted"),
}).refine((data) => {
  if (!data.confirmPassword) return true;
  return data.password === data.confirmPassword;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type OrganizationFormData = z.infer<typeof organizationSchema>; 