import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { createValidatedRoute } from "@/middleware/validation";
import { SecurityProfile, UpdateSecurityProfileInput } from "@/types/security-profile";
import { updateSecurityProfileSchema } from "@/lib/validations/security-profile";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_SECURITY_PROFILES_TABLE || "";

if (!TABLE_NAME) {
  throw new Error("SECURITY_PROFILES_TABLE is not defined in environment variables");
}

// GET /api/security-profiles/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json(
        { error: "Profile ID is required" },
        { status: 400 }
      );
    }

    // Get the tenant ID from the request
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    console.log("Fetching security profile:", {
      profileId: params.id,
      tenantId,
      tableName: TABLE_NAME
    });

    // Use the GSI to look up by profileId
    const response = await db.query<SecurityProfile>(
      TABLE_NAME,
      {
        IndexName: "ProfileIdIndex",
        KeyConditionExpression: "profileId = :profileId",
        ExpressionAttributeValues: {
          ":profileId": params.id,
        },
      }
    );

    console.log("Query response:", response);

    if (!response.items?.length) {
      return NextResponse.json(
        { error: "Security profile not found" },
        { status: 404 }
      );
    }

    const profile = response.items[0];
    
    // Verify tenant ownership
    if (profile.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Not authorized to access this profile" },
        { status: 403 }
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching security profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch security profile" },
      { status: 500 }
    );
  }
}

// PUT /api/security-profiles/:id
export const PUT = createValidatedRoute(
  async (
    request: NextRequest,
    validated: UpdateSecurityProfileInput,
    { params }: { params: { id: string } }
  ) => {
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
        {
          IndexName: "ProfileIdIndex",
          KeyConditionExpression: "profileId = :profileId",
          ExpressionAttributeValues: {
            ":profileId": params.id,
          },
        }
      );

      if (!response.items?.length) {
        return NextResponse.json(
          { error: "Security profile not found" },
          { status: 404 }
        );
      }

      const existingProfile = response.items[0];
      
      // Verify tenant ownership
      if (existingProfile.tenantId !== tenantId) {
        return NextResponse.json(
          { error: "Not authorized to access this profile" },
          { status: 403 }
        );
      }

      const updates: Partial<SecurityProfile> = {
        ...validated,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };

      console.log("Updating security profile:", {
        key: { tenantId, profileId: params.id },
        updates,
      });

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
  },
  updateSecurityProfileSchema
);

// DELETE /api/security-profiles/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json(
        { error: "Profile ID is required" },
        { status: 400 }
      );
    }

    // Get the tenant ID from the request
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    // Get the profile first to verify tenant ownership
    const response = await db.query<SecurityProfile>(
      TABLE_NAME,
      {
        IndexName: "ProfileIdIndex",
        KeyConditionExpression: "profileId = :profileId",
        ExpressionAttributeValues: {
          ":profileId": params.id,
        },
      }
    );

    if (!response.items?.length) {
      return NextResponse.json(
        { error: "Security profile not found" },
        { status: 404 }
      );
    }

    const profile = response.items[0];
    
    // Verify tenant ownership
    if (profile.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Not authorized to access this profile" },
        { status: 403 }
      );
    }

    // Delete the profile
    await db.delete(TABLE_NAME, { tenantId, profileId: params.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting security profile:", error);
    return NextResponse.json(
      { error: "Failed to delete security profile" },
      { status: 500 }
    );
  }
} 