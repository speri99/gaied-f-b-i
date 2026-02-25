import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { getServerAuthContext } from "@/lib/server-auth";
import { checkPermissions } from "@/middleware/permissions";
import { logSensitiveAccess } from "@/middleware/permissions";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_CONTACT_RECORDS_TABLE || "GEO-LocationRecords-New";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getServerAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { tenantId, userId } = authContext;
    const reason = request.headers.get("x-access-reason");

    if (!reason) {
      return NextResponse.json(
        { error: "Access reason is required" },
        { status: 400 }
      );
    }

    // Check if user has permission to view sensitive locations
    const hasPermission = await checkPermissions(userId, tenantId, ["read:locations"]);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Use scan with filter and expression attribute names for reserved keywords
    const result = await db.scan(
      TABLE_NAME,
      "#uuid = :uuid",
      { ":uuid": params.id },
      undefined,
      undefined,
      { "#uuid": "UUID" }
    );

    if (!result.items || result.items.length === 0) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const contact = result.items[0];

    // Verify tenant ownership
    if (contact.tenantId && contact.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Log the access - handle errors gracefully
    try {
      await logSensitiveAccess(
        userId,
        params.id,
        "view",
        reason,
        tenantId
      );
    } catch (logError) {
      console.error("Error logging sensitive access:", logError);
      // Continue execution even if logging fails
    }

    // Return only the location data
    return NextResponse.json({
      latitude: contact.latitude,
      longitude: contact.longitude,
      formattedAddress: contact.formattedAddress,
    });
  } catch (error) {
    console.error("Error fetching contact location:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact location" },
      { status: 500 }
    );
  }
} 