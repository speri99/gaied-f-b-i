import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { v4 as uuidv4 } from "uuid";
import { getAuthContext } from "@/lib/auth";
import { ActionLogService } from "@/lib/services/action-log.service";
import { createProtectedRoute } from "@/middleware/permissions";
import { debug } from "@/lib/debug";
import { getVerifiedTenantId } from "@/lib/utils/tenant-verify";

interface WebsiteTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  html: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

const TEMPLATES_TABLE = process.env.DYNAMODB_WEBSITE_TEMPLATES_TABLE || 'GEO-WebsiteTemplates';
const dynamoDb = new DynamoDBService();

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getVerifiedTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await dynamoDb.query<WebsiteTemplate>(TEMPLATES_TABLE, {
      KeyConditionExpression: 'tenantId = :tenantId',
      FilterExpression: 'deleted = :deleted',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':deleted': false
      }
    });

    // Return the items array directly
    return NextResponse.json(result.items);
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getVerifiedTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const now = new Date().toISOString();

    const template: WebsiteTemplate = {
      ...body,
      tenantId,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      deleted: false
    };

    await dynamoDb.put({ tableName: TEMPLATES_TABLE, item: template });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Failed to create template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

// Export the route handlers with permission checks
// Using the permission format that matches what's returned by the /api/permissions/me endpoint
export const GET_ROUTE = createProtectedRoute(GET, ["ViewCases"]);
export const POST_ROUTE = createProtectedRoute(POST, ["EditCases"]); 