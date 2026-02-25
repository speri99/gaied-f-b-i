import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { createProtectedRoute } from "@/middleware/permissions";
import { logSensitiveAccess } from "@/middleware/permissions";
import { SensitiveLocationData } from "@/types/contact";
import { ActionLogService } from "@/lib/services/action-log.service";
import { getAuthContext } from "@/lib/auth";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_SENSITIVE_LOCATIONS_TABLE;

if (!TABLE_NAME) {
  throw new Error("DYNAMODB_SENSITIVE_LOCATIONS_TABLE is not defined in environment variables");
}

// GET /api/locations/:id
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

    const location = await db.get<SensitiveLocationData>(TABLE_NAME, {
      UUID: params.id,
      tenantId // Ensure tenant isolation
    });

    if (!location) {
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

    // Log the action
    await ActionLogService.logAction({
      tenantId,
      userId,
      entityId: params.id,
      entityType: 'location',
      action: 'view',
      details: {
        reason,
        locationData: {
          latitude: location.latitude,
          longitude: location.longitude,
          formattedAddress: location.formattedAddress
        }
      }
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error("Error getting location:", error);
    return NextResponse.json(
      { error: "Failed to get location" },
      { status: 500 }
    );
  }
}

// POST /api/locations
async function createLocation(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")!;
    const body = await request.json();

    const newLocation: SensitiveLocationData = {
      UUID: body.UUID,
      timestamp: Date.now(),
      location: body.location,
      accessLog: [{
        userId,
        timestamp: Date.now(),
        action: "modify",
        reason: "Initial creation",
        ipAddress: request.headers.get("x-forwarded-for") || "",
        userAgent: request.headers.get("user-agent") || "",
      }],
    };

    await db.put(TABLE_NAME, newLocation);
    return NextResponse.json(newLocation, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}

// PATCH /api/locations/:id
async function updateLocation(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id")!;
    const reason = request.headers.get("x-access-reason");
    const body = await request.json();

    if (!reason) {
      return NextResponse.json(
        { error: "Access reason is required" },
        { status: 400 }
      );
    }

    const existingLocation = await db.get<SensitiveLocationData>(
      TABLE_NAME,
      { UUID: params.id }
    );

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const updates: Partial<SensitiveLocationData> = {
      location: body.location,
      accessLog: [
        ...existingLocation.accessLog,
        {
          userId,
          timestamp: Date.now(),
          action: "modify",
          reason,
          ipAddress: request.headers.get("x-forwarded-for") || "",
          userAgent: request.headers.get("user-agent") || "",
        },
      ],
    };

    const updatedLocation = await db.update<SensitiveLocationData>(
      TABLE_NAME,
      { UUID: params.id },
      updates
    );

    return NextResponse.json(updatedLocation);
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}

// Export the route handlers with permission checks
export const GET = createProtectedRoute(getLocation, ["read:locations"]);
export const POST = createProtectedRoute(createLocation, ["write:locations"]);
export const PATCH = createProtectedRoute(updateLocation, ["write:locations"]); 