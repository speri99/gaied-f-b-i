import { DynamoDB } from "aws-sdk";
import { OrganizationFormData } from "@/lib/validations/organization";
import { v4 as uuidv4 } from "uuid";

// Initialize DynamoDB client with region from environment variables
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!region || !accessKeyId || !secretAccessKey) {
  console.error("Missing AWS credentials in environment variables");
  throw new Error("Missing AWS credentials in environment variables");
}

const dynamoDB = new DynamoDB.DocumentClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  maxRetries: 3,
});

export class OrganizationService {
  static async createOrganization(data: OrganizationFormData) {
    const timestamp = Date.now();
    const userId = `USER-${uuidv4()}`;
    const profileId = `PROF-${uuidv4()}`;

    // Create security profile
    const securityProfile = {
      profileId,
      name: `${data.name} Admin Profile`,
      description: `Administrator profile for ${data.name}`,
      tenantId: data.subdomain,
      status: "Active",
      permissions: {
        deletedItems: "write",
        reports: "write",
        cases: "write",
        websiteTemplates: "write",
        locations: "write",
        users: "write",
        contacts: "write",
        securityProfiles: "write"
      },
      tags: ["admin"],
      createdAt: new Date(timestamp).toISOString(),
      updatedAt: new Date(timestamp).toISOString(),
      createdBy: "system",
      updatedBy: "system"
    };

    // Create user
    const user = {
      userId,
      firstName: data.contactName.split(" ")[0],
      lastName: data.contactName.split(" ").slice(1).join(" "),
      email: data.contactEmail,
      phoneNumber: data.contactPhone,
      tenantId: data.subdomain,
      status: "Active",
      authMethod: "EMAIL",
      securityProfiles: [profileId],
      smsEnabled: true,
      metadata: {
        organizationName: data.name,
        organizationType: data.type,
        jurisdiction: data.jurisdiction,
        region: data.region,
        state: data.state,
        preferredContactMethod: data.preferredContactMethod,
        website: data.website,
        billingType: data.billingType,
        termsAccepted: data.termsAccepted
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: "system",
      updatedBy: "system"
    };

    // Create tenant
    const tenant = {
      tenantId: data.subdomain,
      name: data.name,
      status: "Active",
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: "system",
      updatedBy: "system"
    };

    // Write to DynamoDB
    await Promise.all([
      dynamoDB.put({ TableName: process.env.DYNAMODB_SECURITY_PROFILES_TABLE!, Item: securityProfile }).promise(),
      dynamoDB.put({ TableName: process.env.DYNAMODB_USERS_TABLE!, Item: user }).promise(),
      dynamoDB.put({ TableName: process.env.DYNAMODB_TENANTS_TABLE!, Item: tenant }).promise()
    ]);

    return {
      organization: {
        id: data.subdomain,
        name: data.name,
        subdomain: data.subdomain,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        staffSize: data.staffSize,
        type: data.type,
        jurisdiction: data.jurisdiction,
        region: data.region,
        state: data.state,
        preferredContactMethod: data.preferredContactMethod,
        website: data.website,
        billingType: data.billingType,
        termsAccepted: data.termsAccepted
      },
      userId,
      profileId
    };
  }
} 