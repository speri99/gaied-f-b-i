import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { getServerAuthContext } from "@/lib/server-auth";
import { checkPermissions } from "@/middleware/permissions";
import { ContactRecord } from "@/types/contact";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_CONTACT_RECORDS_TABLE;

export async function GET(request: NextRequest) {
  try {
    const authContext = await getServerAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenantId, userId } = authContext;
    console.log('API request from user:', { tenantId, userId });

    const hasPermission = await checkPermissions(userId, tenantId, ["read:contacts"]);
    console.log('User has permission:', hasPermission);

    if (!hasPermission) {
      console.log('Permission denied for user:', { userId, tenantId });
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const caseId = searchParams.get("caseId");
    const phoneNumber = searchParams.get("phoneNumber");
    const search = searchParams.get("search");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const lastKey = searchParams.get("lastKey");
    const sortField = searchParams.get("sortField") || "timestamp";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    console.log('Search parameters:', { caseId, phoneNumber, search, pageSize, lastKey, sortField, sortOrder });
    console.log('Table name:', TABLE_NAME);

    let filterExpression = "tenantId = :tenantId";
    const expressionAttributeValues: any = {
      ":tenantId": tenantId
    };

    if (phoneNumber) {
      filterExpression += " AND identifier = :phoneNumber";
      expressionAttributeValues[":phoneNumber"] = phoneNumber;
    }

    if (caseId) {
      filterExpression += " AND caseId = :caseId";
      expressionAttributeValues[":caseId"] = caseId;
    }

    if (search) {
      filterExpression += " AND (identifier CONTAINS :search OR caseId CONTAINS :search)";
      expressionAttributeValues[":search"] = search;
    }

    console.log('Scan parameters:', { 
      filterExpression, 
      expressionAttributeValues,
      tableName: TABLE_NAME
    });

    const response = await db.scan<ContactRecord>(
      TABLE_NAME,
      filterExpression || undefined,
      expressionAttributeValues,
      pageSize,
      lastKey ? (() => {
        try {
          return JSON.parse(lastKey);
        } catch (error) {
          console.error("Error parsing lastKey:", error);
          return undefined;
        }
      })() : undefined
    );

    console.log('Scan response:', { 
      count: response.total,
      hasItems: !!response.items?.length,
      items: response.items?.map(item => ({
        UUID: item.UUID,
        identifier: item.identifier,
        caseId: item.caseId,
        timestamp: item.timestamp,
        status: item.status,
        type: item.type
      }))
    });

    // Sanitize sensitive data
    let sanitizedItems = response.items?.map(item => ({
      ...item,
      latitude: undefined,
      longitude: undefined,
      formattedAddress: undefined,
    })) || [];

    // Sort the items by the specified field and order
    sanitizedItems.sort((a, b) => {
      const aValue = a[sortField as keyof typeof a];
      const bValue = b[sortField as keyof typeof b];
      
      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // For pagination, we need to estimate the total count
    // If we have a lastEvaluatedKey, it means there are more items
    // We'll use a higher number to indicate there are more records
    const estimatedTotal = response.lastEvaluatedKey 
      ? Math.max(response.total || 0, pageSize * 2) 
      : (response.total || sanitizedItems.length);

    return NextResponse.json({
      items: sanitizedItems,
      lastEvaluatedKey: response.lastEvaluatedKey,
      total: estimatedTotal
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
