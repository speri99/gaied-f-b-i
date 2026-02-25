import { DynamoDBService } from "@/lib/dynamodb";
import { Organization, CreateOrganizationInput } from "@/types/organization";
import { normalizePhoneNumber } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { SecurityProfile } from "@/types/security-profile";

// Initialize DynamoDB service
const db = new DynamoDBService();
const ORGANIZATIONS_TABLE = process.env.DYNAMODB_TENANTS_TABLE || "GEO-Tenants";
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || "GEO-Users";
const SECURITY_PROFILES_TABLE = process.env.DYNAMODB_SECURITY_PROFILES_TABLE || "GEO-SecurityProfiles";

export class OrganizationService {
  static async createOrganization(input: CreateOrganizationInput & { password: string }): Promise<{ organization: Organization; userId: string; profileId: string }> {
    const timestamp = new Date().toISOString();
    const organizationId = uuidv4();
    const userId = `USER-${uuidv4()}`;
    const profileId = `PROF-${uuidv4()}`;

    // Create organization object - match the actual table structure
    const organization = {
      id: organizationId,
      tenantId: organizationId,
      tenantName: input.name,
      subdomain: input.subdomain,
      type: input.type,
      jurisdiction: input.jurisdiction,
      region: input.region || "",
      state: input.state || "",
      website: input.website || "",
      billingType: input.billingType,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: "Pending", // Organizations start as pending until approved
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      billingContactName: input.billingContactName,
      billingContactEmail: input.billingContactEmail,
      staffSize: input.staffSize,
      preferredContactMethod: input.preferredContactMethod || "email",
      termsAccepted: input.termsAccepted,
    };

    // Create user object with hashed password - match the actual table structure
    const user = {
      userId: userId,
      tenantId: organizationId,
      email: input.contactEmail,
      firstName: input.contactName.split(' ')[0] || input.contactName,
      lastName: input.contactName.split(' ').slice(1).join(' ') || '',
      phoneNumber: input.contactPhone,
      role: "Admin",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "Active",
      authMethod: "Password",
      smsEnabled: false,
      securityProfiles: [profileId],
      metadata: {
        hashedPassword: input.password, // Password is already hashed on the client side
        lastPasswordChange: Date.now()
      },
      createdBy: "system",
      updatedBy: "system"
    };

    // Create default security profile - match the actual table structure
    const securityProfile = {
      profileId: profileId,
      tenantId: organizationId,
      name: "Default Admin Profile",
      description: "Default security profile for organization administrators",
      status: "Active",
      permissions: {
        users: "write",
        cases: "none", // Disabled until approved
        contacts: "write",
        locations: "write",
        reports: "write",
        securityProfiles: "write",
        deletedItems: "write",
        websiteTemplates: "write",
      },
      tags: ["admin", "default"],
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: "system",
      updatedBy: "system",
    };

    try {
      // Use a transaction to create organization, user, and security profile
      await db.transactWrite({
        TransactItems: [
          {
            Put: {
              TableName: ORGANIZATIONS_TABLE,
              Item: organization,
              ConditionExpression: "attribute_not_exists(id) AND attribute_not_exists(subdomain)",
            },
          }
          // {
          //   Put: {
          //     TableName: USERS_TABLE,
          //     Item: user,
          //     ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(email)",
          //   },
          // },
          // {
          //   Put: {
          //     TableName: SECURITY_PROFILES_TABLE,
          //     Item: securityProfile,
          //     ConditionExpression: "attribute_not_exists(profileId)",
          //   },
          // },
        ],
      });

      // Return safe objects without sensitive data
      const safeOrganization = { ...organization };
      const safeUser = { ...user };
      console.log(organization);
      delete safeUser.metadata?.hashedPassword;

      return { 
        organization: safeOrganization, 
        userId, 
        profileId 
      };
    } catch (error) {
      console.error("Error in createOrganization:", error);
      throw error;
    }
  }

  static async getOrganizationById(id: string): Promise<Organization | null> {
    try {
      return await db.get<Organization>(ORGANIZATIONS_TABLE, { id });
    } catch (error) {
      console.error("Error getting organization by ID:", error);
      return null;
    }
  }

  static async getOrganizationBySubdomain(subdomain: string): Promise<Organization | null> {
    try {
      const result = await db.scan<Organization>(
        ORGANIZATIONS_TABLE,
        "subdomain = :subdomain",
        { ":subdomain": subdomain },
        1
      );
      return result.items[0] || null;
    } catch (error) {
      console.error("Error getting organization by subdomain:", error);
      return null;
    }
  }

  static async getOrganizationByContactEmail(email: string): Promise<Organization | null> {
    try {
      console.log("OrganizationService: Getting organization by contact email:", email);
      
      // First, try to find the organization by scanning the table
      const result = await db.scan<Organization>(
        ORGANIZATIONS_TABLE,
        "contactEmail = :email",
        { ":email": email },
        1
      );

      console.log("OrganizationService: Scan result:", JSON.stringify(result, null, 2));

      if (result.items && result.items.length > 0) {
        console.log("OrganizationService: Organization found by scan:", result.items[0]);
        return result.items[0];
      }
      
      // If scan didn't work, try to get all organizations and filter in memory
      console.log("OrganizationService: Scan didn't find organization, trying to get all organizations");
      const allOrgs = await db.scan<Organization>(ORGANIZATIONS_TABLE);
      
      console.log("OrganizationService: Found", allOrgs.items.length, "organizations");
      
      const org = allOrgs.items.find(org => org.contactEmail === email);
      
      if (org) {
        console.log("OrganizationService: Organization found by filtering:", org);
        return org;
      }

      console.log("OrganizationService: No organization found for email:", email);
      return null;
    } catch (error) {
      console.error("Error getting organization by contact email:", error);
      return null;
    }
  }

  static async updateOrganization(
    id: string,
    updates: Partial<Organization>
  ): Promise<Organization> {
    const timestamp = new Date().toISOString();
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== "id" && key !== "createdAt") {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = timestamp;

    const result = await db.update(ORGANIZATIONS_TABLE, {
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    });

    return result.Attributes as Organization;
  }

  static async deactivateOrganization(id: string): Promise<void> {
    await this.updateOrganization(id, { status: "Inactive" });
  }

  static async listOrganizations(
    limit: number = 10,
    lastEvaluatedKey?: any
  ): Promise<{ items: Organization[]; lastEvaluatedKey?: any }> {
    const result = await db.scan<Organization>(
      ORGANIZATIONS_TABLE,
      undefined,
      {
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      }
    );

    return {
      items: result.items as Organization[],
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  static async getOrganizationByTenantId(tenantId: string): Promise<Organization | null> {
    try {
      // Use { id: tenantId } since the partition key is 'id'
      return await db.get<Organization>(ORGANIZATIONS_TABLE, { id: tenantId });
    } catch (error) {
      console.error("Error getting organization by tenantId:", error);
      return null;
    }
  }
} 