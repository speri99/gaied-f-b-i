import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { getAuthContext } from "@/lib/auth";
import { ActionLogService } from "@/lib/services/action-log.service";
import { createProtectedRoute } from "@/middleware/permissions";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_SHORTENED_URLS_TABLE;

if (!TABLE_NAME) {
  throw new Error("DYNAMODB_SHORTENED_URLS_TABLE is not defined in environment variables");
}

async function getShortenedUrl(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { tenantId, userId } = getAuthContext();
    const { code } = params;

    if (!code) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    console.log('Fetching shortened URL for code:', code);

    const result = await db.get(TABLE_NAME, { 
      code,
      tenantId // Ensure tenant isolation
    });

    if (!result) {
      return NextResponse.json(
        { error: "Shortened URL not found" },
        { status: 404 }
      );
    }

    // Log the action
    await ActionLogService.logAction({
      tenantId,
      userId,
      entityId: code,
      entityType: 'shortened_url',
      action: 'view',
      details: {
        originalUrl: result.originalUrl,
        caseId: result.caseId
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching shortened URL:", error);
    return NextResponse.json(
      { error: "Failed to fetch shortened URL" },
      { status: 500 }
    );
  }
}

// Export the route handler with permission checks
export const GET = createProtectedRoute(getShortenedUrl, ["read:shortened_urls"]); 