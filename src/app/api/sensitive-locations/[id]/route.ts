import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { getAuthContext } from "@/lib/auth";
import { logSensitiveAccess } from "@/middleware/permissions";
import { createProtectedRoute } from "@/middleware/permissions";
import { checkPermissions } from "@/middleware/permissions";
import { Permission } from "@/types/security";

interface LocationRecord {
  id: string;
  tenantId: string;
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_LOCATION_RECORDS_TABLE;

// Define the handler function
async function getLocation(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId, userId } = getAuthContext();
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

    console.log('Fetching location record with ID:', params.id);
    
    // Get the location record
    const location = await db.get<LocationRecord>(TABLE_NAME, { 
      UUID: params.id
    });

    console.log('DynamoDB result:', location);

    if (!location) {
      console.log('Location not found');
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Verify tenant ownership
    if (location.tenantId && location.tenantId !== tenantId) {
      console.log('Tenant mismatch:', { recordTenant: location.tenantId, userTenant: tenantId });
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Log the access
    await logSensitiveAccess(
      userId,
      params.id,
      "view",
      reason
    );

    // Return the location data in the expected format
    const response = {
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        formattedAddress: location.formattedAddress || `${location.latitude}, ${location.longitude}`,
      }
    };

    console.log('Returning response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching sensitive location:", error);
    return NextResponse.json(
      { error: "Failed to fetch location" },
      { status: 500 }
    );
  }
}

// Export the route handler with permission checks
export const GET = createProtectedRoute(getLocation, ["read:locations"]); 