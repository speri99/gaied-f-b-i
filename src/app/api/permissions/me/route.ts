import { NextRequest, NextResponse } from "next/server";
import { getVerifiedTenantId } from "@/lib/utils/tenant-verify";
import { SecurityProfile } from "@/types/security-profile";
import { DynamoDBService } from "@/lib/dynamodb";
import { User } from "@/types/user";

// GET /api/permissions/me
export async function GET(request: NextRequest) {
  const db = new DynamoDBService();
  try {
    // Get the verified tenant ID from the middleware
    const tenantId = getVerifiedTenantId(request);
    const userId = request.headers.get("x-user-id");

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 }
      );
    }
    const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE;
    const PROFILES_TABLE = process.env.DYNAMODB_SECURITY_PROFILES_TABLE;

    if (!USERS_TABLE || !PROFILES_TABLE) {
      console.error("Missing required environment variables:", {
        DYNAMODB_USERS_TABLE: !!USERS_TABLE,
        DYNAMODB_SECURITY_PROFILES_TABLE: !!PROFILES_TABLE
      });
      return false;
    }

    // Use the UserIdIndex to look up the user
    const userResponse = await db.query<User>(USERS_TABLE, {
      IndexName: "UserIdIndex",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    });

    if (!userResponse.items?.length) {
      console.warn(`User ${userId} not found`);
      return false;
    }

    const user = userResponse.items[0];
    if (user.status !== "Active") {
      console.warn(`User ${userId} is not active`);
      return false;
    }

    // Verify tenant ownership
    if (user.tenantId !== tenantId) {
      console.warn(`User ${userId} does not belong to tenant ${tenantId}`);
      return false;
    }

    const profileIds = user.securityProfiles || [];
    if (!Array.isArray(profileIds) || profileIds.length === 0) {
      console.warn(`User ${userId} has no assigned security profiles`);
      return false;
    }

    // Use the ProfileIdIndex to look up the profile
    const profileResponse = await db.query<SecurityProfile>(PROFILES_TABLE, {
      IndexName: "ProfileIdIndex",
      KeyConditionExpression: "profileId = :profileId",
      ExpressionAttributeValues: {
        ":profileId": profileId,
      },
    });


    return NextResponse.json({ profileResponse.permissions });
  } catch (error) {
    console.error("Error getting user permissions:", error);
    if (error instanceof Error && error.message === 'Missing verified tenant ID') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to get user permissions" },
      { status: 500 }
    );
  }
} 