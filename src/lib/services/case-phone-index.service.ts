import { DynamoDBService } from "@/lib/dynamodb";
import { CasePhoneIndex } from "@/types/case-phone-index";
import { normalizePhoneNumber } from "@/lib/utils";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_CASE_PHONE_INDEX_TABLE!;

export class CasePhoneIndexService {
  static async addPhoneNumber(
    tenantId: string,
    caseId: string,
    phoneNumber: string,
    isPrimary: boolean = false,
    label?: string
  ): Promise<CasePhoneIndex> {
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhoneNumber) {
      throw new Error("Invalid phone number format");
    }

    const timestamp = new Date().toISOString();
    
    // If this is marked as primary, we need to update any existing primary numbers
    if (isPrimary) {
      await this.unsetPrimaryPhoneNumber(tenantId, caseId);
    }

    const phoneIndex: CasePhoneIndex = {
      tenantId,
      phoneNumber: normalizedPhoneNumber,
      caseId,
      createdAt: timestamp,
      updatedAt: timestamp,
      isPrimary,
      label,
    };

    await db.put({ tableName: TABLE_NAME, item: phoneIndex });
    return phoneIndex;
  }

  static async getPhoneNumbersByCaseId(tenantId: string, caseId: string): Promise<CasePhoneIndex[]> {
    const result = await db.query(TABLE_NAME, {
      IndexName: "byCaseId",
      KeyConditionExpression: "caseId = :caseId",
      ExpressionAttributeValues: {
        ":caseId": caseId,
      },
    });

    return result.items || [];
  }

  static async getCaseByPhoneNumber(tenantId: string, phoneNumber: string): Promise<CasePhoneIndex | null> {
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhoneNumber) {
      throw new Error("Invalid phone number format");
    }

    return await db.get(TABLE_NAME, { 
      tenantId, 
      phoneNumber: normalizedPhoneNumber 
    });
  }

  static async updatePhoneNumber(
    tenantId: string,
    phoneNumber: string,
    updates: Partial<Omit<CasePhoneIndex, "tenantId" | "phoneNumber" | "caseId" | "createdAt">>
  ): Promise<CasePhoneIndex> {
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhoneNumber) {
      throw new Error("Invalid phone number format");
    }

    const existingIndex = await db.get(TABLE_NAME, { 
      tenantId, 
      phoneNumber: normalizedPhoneNumber 
    });
    
    if (!existingIndex) {
      throw new Error("Phone number not found");
    }

    // If this is being marked as primary, we need to update any existing primary numbers
    if (updates.isPrimary) {
      await this.unsetPrimaryPhoneNumber(tenantId, existingIndex.caseId);
    }

    const updatedIndex = {
      ...existingIndex,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.put({ tableName: TABLE_NAME, item: updatedIndex });
    return updatedIndex;
  }

  static async removePhoneNumber(tenantId: string, phoneNumber: string): Promise<void> {
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhoneNumber) {
      throw new Error("Invalid phone number format");
    }

    await db.delete(TABLE_NAME, { 
      tenantId, 
      phoneNumber: normalizedPhoneNumber 
    });
  }

  static async removeAllPhoneNumbersForCase(tenantId: string, caseId: string): Promise<void> {
    const phoneNumbers = await this.getPhoneNumbersByCaseId(tenantId, caseId);
    
    for (const phoneIndex of phoneNumbers) {
      await this.removePhoneNumber(tenantId, phoneIndex.phoneNumber);
    }
  }

  private static async unsetPrimaryPhoneNumber(tenantId: string, caseId: string): Promise<void> {
    const phoneNumbers = await this.getPhoneNumbersByCaseId(tenantId, caseId);
    
    for (const phoneIndex of phoneNumbers) {
      if (phoneIndex.isPrimary) {
        await this.updatePhoneNumber(tenantId, phoneIndex.phoneNumber, { isPrimary: false });
      }
    }
  }
} 