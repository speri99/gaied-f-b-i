import { DynamoDBService } from "@/lib/dynamodb";
import { Tenant } from "@/types/tenant";
import { normalizePhoneNumber } from "@/lib/utils";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_TENANTS_TABLE!;

export class TenantService {
  static async create(tenant: Omit<Tenant, "createdAt" | "updatedAt" | "status">): Promise<Tenant> {
    const timestamp = new Date().toISOString();
    
    // Normalize phone numbers
    const smsPhoneNumber = normalizePhoneNumber(tenant.smsPhoneNumber);
    const contactPhoneNumber = normalizePhoneNumber(tenant.contactPhoneNumber);
    
    if (!smsPhoneNumber || !contactPhoneNumber) {
      throw new Error("Invalid phone number format");
    }

    const newTenant: Tenant = {
      ...tenant,
      smsPhoneNumber,
      contactPhoneNumber,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: "Active",
    };

    await db.put({ tableName: TABLE_NAME, item: newTenant });
    return newTenant;
  }

  static async get(tenantId: string): Promise<Tenant | null> {
    return await db.get(TABLE_NAME, { tenantId });
  }

  static async getByName(name: string): Promise<Tenant | null> {
    const result = await db.query(TABLE_NAME, {
      IndexName: "byName",
      KeyConditionExpression: "name = :name",
      ExpressionAttributeValues: {
        ":name": name,
      },
    });

    return result.items?.[0] || null;
  }

  static async update(tenantId: string, updates: Partial<Omit<Tenant, "tenantId" | "createdAt">>): Promise<Tenant> {
    const existingTenant = await this.get(tenantId);
    if (!existingTenant) {
      throw new Error("Tenant not found");
    }

    // Normalize phone numbers if they're being updated
    if (updates.smsPhoneNumber) {
      updates.smsPhoneNumber = normalizePhoneNumber(updates.smsPhoneNumber) || updates.smsPhoneNumber;
    }
    if (updates.contactPhoneNumber) {
      updates.contactPhoneNumber = normalizePhoneNumber(updates.contactPhoneNumber) || updates.contactPhoneNumber;
    }

    const updatedTenant = {
      ...existingTenant,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.put({ tableName: TABLE_NAME, item: updatedTenant });
    return updatedTenant;
  }

  static async deactivate(tenantId: string): Promise<Tenant> {
    return await this.update(tenantId, { status: "Inactive" });
  }

  static async activate(tenantId: string): Promise<Tenant> {
    return await this.update(tenantId, { status: "Active" });
  }
} 