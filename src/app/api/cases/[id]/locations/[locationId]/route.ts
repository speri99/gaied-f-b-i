import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { getServerAuthContext } from "@/lib/server-auth";
import { checkPermissions } from "@/middleware/permissions";
import { Case } from "@/types/case";

const db = new DynamoDBService();
const CASES_TABLE = process.env.DYNAMODB_CASE_RECORDS_TABLE || "GEO-CaseRecords";
const LOCATIONS_TABLE = process.env.DYNAMODB_CONTACT_RECORDS_TABLE || "GEO-LocationRecords-New";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; locationId: string } }
) {
  try {
    const authContext = getServerAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const { tenantId, userId } = authContext;

    // Check permission to read locations
    const hasLocationPermission = await checkPermissions(userId, tenantId, ["read:locations"]);
    if (!hasLocationPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get case to verify correct phone number or ownership
    const caseRecord = await db.get<Case>(CASES_TABLE, { Identifier: params.id });
    if (!caseRecord) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    // Verify tenant ownership
    if (caseRecord.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get the location using the composite primary key (UUID and tenantId)
    const location = await db.get(LOCATIONS_TABLE, {
      UUID: params.locationId,
      tenantId: tenantId
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location record not found" },
        { status: 404 }
      );
    }

    // Return just the location data
    return NextResponse.json({
      UUID: location.UUID,
      timestamp: location.timestamp,
      formattedAddress: location.formattedAddress,
      latitude: location.latitude,
      longitude: location.longitude
    });
  } catch (error) {
    console.error("Error fetching single location:", error);
    return NextResponse.json(
      { error: "Failed to fetch location" },
      { status: 500 }
    );
  }
} 