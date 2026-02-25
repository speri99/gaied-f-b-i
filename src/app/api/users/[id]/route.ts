import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { createValidatedRoute } from "@/middleware/validation";
import { User, UpdateUserInput } from "@/types/user";
import { updateUserSchema } from "@/lib/validations/user";
import bcrypt from "bcryptjs";
import { getVerifiedTenantId } from "@/lib/utils/tenant-verify";

const db = new DynamoDBService();
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || "GEO-Users";

if (!USERS_TABLE) {
  throw new Error("DYNAMODB_USERS_TABLE is not defined in environment variables");
}

// PATCH /api/users/:id
async function updateUser(
  request: NextRequest,
  validated: UpdateUserInput,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getVerifiedTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const existingUser = await db.get<User>(USERS_TABLE, { 
      userId: params.id,
      tenantId 
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const updates: Partial<User> = {
      ...validated,
      updatedAt: now,
      updatedBy: request.headers.get("x-user-id") || "system",
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof User] === undefined) {
        delete updates[key as keyof User];
      }
    });

    await db.update(USERS_TABLE, { userId: params.id, tenantId }, updates);

    return NextResponse.json({
      ...existingUser,
      ...updates
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/:id
async function deleteUser(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getVerifiedTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const existingUser = await db.get<User>(USERS_TABLE, { 
      userId: params.id,
      tenantId 
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    await db.delete(USERS_TABLE, { userId: params.id, tenantId });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

// GET /api/users/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getVerifiedTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Try to get the user with the provided ID
    const user = await db.get<User>(USERS_TABLE, { 
      userId: params.id,
      tenantId 
    });

    if (!user) {
      // If not found with exact ID, try scanning with a filter
      const result = await db.scan<User>(
        USERS_TABLE,
        "userId = :userId AND tenantId = :tenantId",
        { 
          ":userId": params.id,
          ":tenantId": tenantId
        }
      );

      if (!result.items?.length) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result.items[0]);
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export const PATCH = createValidatedRoute(updateUser, updateUserSchema);
export const DELETE = deleteUser; 