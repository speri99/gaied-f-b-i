import { DynamoDBService } from "@/lib/dynamodb";
import { Case, CreateCaseInput, UpdateCaseInput, CaseFilter } from "@/types/case";
import { generateCaseId, parseBase62Id } from "@/lib/utils";
import { ShortenedUrlService } from "@/lib/services/shortened-url.service";
import { ActionLogService } from "@/lib/services/action-log.service";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_CASE_RECORDS_TABLE;

if (!TABLE_NAME) {
  throw new Error("DYNAMODB_CASE_RECORDS_TABLE is not defined in environment variables");
}

export class CaseService {
  static async getCase(id: string, tenantId: string): Promise<Case | null> {
    try {
      // Try both formats of the case ID (with hyphens and with hashes)
      const caseIdWithHash = id.replace(/-/g, '#');
      const caseIdWithHyphen = id.replace(/#/g, '-');
      
      // Try to get the case with either format
      let caseRecord = await db.get<Case>(TABLE_NAME, { Identifier: caseIdWithHash });
      
      // If not found, try the hyphenated version
      if (!caseRecord) {
        caseRecord = await db.get<Case>(TABLE_NAME, { Identifier: caseIdWithHyphen });
      }

      // If still not found, return null
      if (!caseRecord) {
        return null;
      }

      // Verify tenant ownership
      if (caseRecord.tenantId !== tenantId) {
        return null;
      }

      return caseRecord;
    } catch (error) {
      console.error("Error in getCase:", error);
      throw error;
    }
  }

  static async getCases(tenantId: string, filter?: CaseFilter) {
    // Build filter expression to always include tenant ID
    let filterExpression = "tenantId = :tenantId";
    const expressionValues: Record<string, any> = {
      ":tenantId": tenantId
    };
    const expressionNames: Record<string, string> = {};

    if (filter) {
      // Handle deleted cases - only include them if explicitly requested
      if (!filter.includeDeleted) {
        filterExpression += " AND #caseStatus <> :deletedStatus";
        expressionValues[":deletedStatus"] = "Deleted";
        expressionNames["#caseStatus"] = "status";
      }

      if (filter.status?.length) {
        const statusExpr = "#caseStatus IN (:statuses)";
        filterExpression += ` AND ${statusExpr}`;
        expressionValues[":statuses"] = filter.status;
        expressionNames["#caseStatus"] = "status";
      }

      if (filter.priority?.length) {
        const priorityExpr = "priority IN (:priorities)";
        filterExpression += ` AND ${priorityExpr}`;
        expressionValues[":priorities"] = filter.priority;
      }

      if (filter.caseType?.length) {
        const typeExpr = "caseType IN (:caseTypes)";
        filterExpression += ` AND ${typeExpr}`;
        expressionValues[":caseTypes"] = filter.caseType;
      }

      if (filter.dateRange) {
        const dateExpr = "createdAt BETWEEN :startDate AND :endDate";
        filterExpression += ` AND ${dateExpr}`;
        expressionValues[":startDate"] = filter.dateRange.start;
        expressionValues[":endDate"] = filter.dateRange.end;
      }

      if (filter.search) {
        const searchExpr = "(contains(VictimName, :search) OR contains(Identifier, :search))";
        filterExpression += ` AND ${searchExpr}`;
        expressionValues[":search"] = filter.search;
      }
    }

    const response = await db.scan<Case>(
      TABLE_NAME,
      filterExpression,
      expressionValues,
      filter?.limit || 10,
      filter?.lastKey ? JSON.parse(filter.lastKey) : undefined,
      expressionNames
    );

    return response.items || [];
  }

  static async createCase(data: CreateCaseInput & { tenantId: string }) {
    const now = Date.now();
    const Identifier = generateCaseId(data.tenantId);
    
    const newCase: Case = {
      Identifier,
      tenantId: data.tenantId,
      VictimName: data.VictimName,
      VictimPhone: data.VictimPhone,
      CaseManager: data.CaseManager,
      CaseManagerEmail: data.CaseManagerEmail,
      CaseManagerPhone: data.CaseManagerPhone,
      BackupCaseManager: data.BackupCaseManager,
      BackupCaseManagerEmail: data.BackupCaseManagerEmail,
      BackupCaseManagerPhone: data.BackupCaseManagerPhone,
      ReportedAbuser: data.ReportedAbuser,
      status: "Active",
      caseType: data.caseType,
      priority: data.priority,
      notes: data.notes,
      smsNotifications: data.smsNotifications || false,
      backupSmsNotifications: data.backupSmsNotifications || false,
      tags: data.tags || [],
      websiteTemplateId: data.websiteTemplateId,
      lastUpdated: new Date().toISOString(),
      createdAt: now,
      updatedAt: now,
      createdBy: data.userId || "system",
      updatedBy: data.userId || "system",
      metadata: data.metadata,
      workflowId:data.workflowId
    };

    // Create the case
    await db.put({ tableName: TABLE_NAME, item: newCase });

    // If a website template is provided, create a shortened URL
    let shortenedUrl = null;
    if (data.websiteTemplateId) {
      try {
        const { base62Id } = parseBase62Id(Identifier);
        shortenedUrl = await ShortenedUrlService.create({
          tenantId: data.tenantId,
          caseId: base62Id,
          websiteTemplateId: data.websiteTemplateId,
        });
      } catch (error) {
        console.error("Error creating shortened URL:", error);
        // Don't fail the case creation if URL creation fails
      }
    }

    // Log the action
    await ActionLogService.logAction({
      tenantId: data.tenantId,
      entityId: Identifier,
      entityType: 'case',
      action: 'create',
      userId: data.userId || "system",
      details: {
        caseType: data.caseType,
        priority: data.priority,
        metadata: data.metadata
      }
    });

    return {
      ...newCase,
      shortenedUrl: shortenedUrl ? {
        code: shortenedUrl.code,
        url: ShortenedUrlService.getFullUrl(shortenedUrl.code)
      } : null
    };
  }

  static async updateCase(id: string, data: UpdateCaseInput & { tenantId: string, userId: string }) {
    const existingCase = await db.get<Case>(TABLE_NAME, { Identifier: id });
    
    if (!existingCase) {
      throw new Error("Case not found");
    }

    // Verify tenant ownership
    if (existingCase.tenantId !== data.tenantId) {
      throw new Error("Unauthorized access to case");
    }

    const updates: Partial<Case> = {
      ...data,
      updatedAt: Date.now(),
      lastUpdated: new Date().toISOString(),
      updatedBy: data.userId,
      // If metadata is being updated, merge it with existing metadata
      metadata: data.metadata ? {
        ...existingCase.metadata,
        ...data.metadata,
        // Ensure required fields are present
        caseType: data.metadata.caseType || existingCase.metadata?.caseType || existingCase.caseType,
        category: data.metadata.category || existingCase.metadata?.category || "Unknown",
        tags: data.metadata.tags || existingCase.metadata?.tags || [],
      } : existingCase.metadata,
    };

    const updatedCase = await db.update<Case>(
      TABLE_NAME,
      { Identifier: id },
      updates
    );

    // Log the action
    await ActionLogService.logAction({
      tenantId: data.tenantId,
      entityId: id,
      entityType: 'case',
      action: 'update',
      userId: data.userId,
      details: {
        previousStatus: existingCase.status,
        newStatus: data.status,
        caseType: data.caseType,
        priority: data.priority,
        metadata: data.metadata
      }
    });

    return updatedCase;
  }

  static async deleteCase(id: string, tenantId: string, userId: string) {
    const existingCase = await db.get<Case>(TABLE_NAME, { Identifier: id });
    
    if (!existingCase) {
      throw new Error("Case not found");
    }

    // Verify tenant ownership
    if (existingCase.tenantId !== tenantId) {
      throw new Error("Unauthorized access to case");
    }

    // Soft delete by updating status to Deleted
    await db.update<Case>(
      TABLE_NAME,
      { Identifier: id },
      { 
        status: "Deleted",
        updatedAt: Date.now(),
        lastUpdated: new Date().toISOString(),
        updatedBy: userId,
      }
    );

    // Log the action
    await ActionLogService.logAction({
      tenantId,
      entityId: id,
      entityType: 'case',
      action: 'delete',
      userId,
      details: {
        previousStatus: existingCase.status,
        newStatus: "Deleted",
        caseType: existingCase.caseType,
        priority: existingCase.priority,
        metadata: existingCase.metadata
      }
    });
  }
} 