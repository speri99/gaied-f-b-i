import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";

const db = new DynamoDBService();
const TABLE_NAME = "GEO-Notes";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    // Get notes for this case
    const result = await db.scan(
      TABLE_NAME,
      "entityId = :entityId AND entityType = :entityType",
      {
        ":entityId": params.id,
        ":entityType": "case",
      }
    );

    // Sort notes by timestamp in descending order
    const notes = result.items?.sort((a, b) => b.timestamp - a.timestamp) || [];

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching case notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch case notes" },
      { status: 500 }
    );
  }
} 