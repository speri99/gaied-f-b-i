import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { createValidatedRoute } from "@/middleware/validation";
import { SecurityProfile, CreateSecurityProfileInput, UpdateSecurityProfileInput, SecurityProfileFilter } from "@/types/security-profile";
import { createSecurityProfileSchema, updateSecurityProfileSchema } from "@/lib/validations/security-profile";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_SECURITY_PROFILES_TABLE;

if (!TABLE_NAME) {
  throw new Error("DYNAMODB_SECURITY_PROFILES_TABLE is not defined in environment variables");
}

// GET /api/security-profiles
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const userId = request.headers.get("x-user-id");

    console.log("GET /api/security-profiles", { tenantId, userId });

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: "Tenant ID and User ID are required" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const showDeleted = searchParams.get("showDeleted") === "true";

    // Start with a simple query first
    const result = await db.query(TABLE_NAME, {
      KeyConditionExpression: "tenantId = :tenantId",
      ExpressionAttributeValues: {
        ":tenantId": tenantId,
      },
    });

    console.log("DynamoDB Query Result:", {
      itemCount: result.items?.length || 0,
      firstItem: result.items?.[0] ? {
        profileId: result.items[0].profileId,
        name: result.items[0].name,
        tenantId: result.items[0].tenantId,
        status: result.items[0].status,
      } : "none",
    });

    // Filter results in memory for now
    let filteredItems = result.items || [];

    if (!showDeleted) {
      filteredItems = filteredItems.filter(item => item.status === "Active");
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower))
      );
    }

    return NextResponse.json({ 
      items: filteredItems,
      total: filteredItems.length 
    });
  } catch (error) {
    console.error("Error in GET /api/security-profiles:", error);
    return NextResponse.json(
      { error: "Failed to fetch security profiles", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/security-profiles
export const POST = createValidatedRoute(
  async (request: NextRequest, validated: CreateSecurityProfileInput) => {
    try {
      const tenantId = request.headers.get("x-tenant-id");
      const userId = request.headers.get("x-user-id");

      console.log("POST /api/security-profiles", { tenantId, userId });

      if (!tenantId || !userId) {
        return NextResponse.json(
          { error: "Tenant ID and User ID are required" },
          { status: 401 }
        );
      }

      const now = new Date().toISOString();
      const newProfile: SecurityProfile = {
        profileId: `PROF-${uuidv4()}`,
        tenantId,
        ...validated,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      };

      console.log("Creating security profile:", newProfile);

      await db.put({
        tableName: TABLE_NAME,
        item: newProfile,
      });

      return NextResponse.json(newProfile, { status: 201 });
    } catch (error) {
      console.error("Error in POST /api/security-profiles:", error);
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid request data", details: error.errors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create security profile" },
        { status: 500 }
      );
    }
  },
  createSecurityProfileSchema
);

// GET /api/security-profiles/:id
async function getSecurityProfile(
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

    const response = await db.query(TABLE_NAME, {
      IndexName: "ProfileIdIndex",
      KeyConditionExpression: "profileId = :profileId",
      ExpressionAttributeValues: {
        ":profileId": params.id,
      },
    });

    if (!response.items.length) {
      return NextResponse.json(
        { error: "Security profile not found" },
        { status: 404 }
      );
    }

    const profile = response.items[0];
    
    // Verify tenant ownership
    if (profile.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Security profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error getting security profile:", error);
    return NextResponse.json(
      { error: "Failed to get security profile" },
      { status: 500 }
    );
  }
}

// PATCH /api/security-profiles/:id
async function updateSecurityProfile(
  request: NextRequest,
  validated: UpdateSecurityProfileInput,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const tenantId = request.headers.get("x-tenant-id");

    if (!userId || !tenantId) {
      return NextResponse.json(
        { error: "User ID and Tenant ID are required" },
        { status: 400 }
      );
    }

    // Use the GSI to look up by profileId
    const response = await db.query<SecurityProfile>(
      TABLE_NAME,
      "profileId = :profileId",
      { ":profileId": params.id },
      "ProfileIdIndex"
    );

    if (!response.items.length) {
      return NextResponse.json(
        { error: "Security profile not found" },
        { status: 404 }
      );
    }

    const existingProfile = response.items[0];
    
    // Verify tenant ownership
    if (existingProfile.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Security profile not found" },
        { status: 404 }
      );
    }

    const updates: Partial<SecurityProfile> = {
      ...validated,
      updatedAt: Date.now(),
      updatedBy: userId,
    };

    const updatedProfile = await db.update<SecurityProfile>(
      TABLE_NAME,
      { tenantId, profileId: params.id },
      updates
    );

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating security profile:", error);
    return NextResponse.json(
      { error: "Failed to update security profile" },
      { status: 500 }
    );
  }
}

// DELETE /api/security-profiles/:id
async function deleteSecurityProfile(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const tenantId = request.headers.get("x-tenant-id");

    if (!userId || !tenantId) {
      return NextResponse.json(
        { error: "User ID and Tenant ID are required" },
        { status: 400 }
      );
    }

    // Use the GSI to look up by profileId
    const response = await db.query<SecurityProfile>(
      TABLE_NAME,
      "profileId = :profileId",
      { ":profileId": params.id },
      "ProfileIdIndex"
    );

    if (!response.items.length) {
      return NextResponse.json(
        { error: "Security profile not found" },
        { status: 404 }
      );
    }

    const existingProfile = response.items[0];
    
    // Verify tenant ownership
    if (existingProfile.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Security profile not found" },
        { status: 404 }
      );
    }

    // Soft delete by updating status to Inactive
    await db.update<SecurityProfile>(
      TABLE_NAME,
      { tenantId, profileId: params.id },
      { 
        status: "Inactive",
        updatedAt: Date.now(),
        updatedBy: userId,
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting security profile:", error);
    return NextResponse.json(
      { error: "Failed to delete security profile" },
      { status: 500 }
    );
  }
}

// Export the route handlers
export const PATCH = createValidatedRoute(updateSecurityProfile, updateSecurityProfileSchema);
export const DELETE = deleteSecurityProfile; 