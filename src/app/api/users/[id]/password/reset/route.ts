import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { User } from "@/types/user";
import bcrypt from "bcryptjs";
import { getVerifiedTenantId } from "@/lib/utils/tenant-verify";
import crypto from "crypto";

const db = new DynamoDBService();
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || "GEO-Users";

if (!USERS_TABLE) {
  throw new Error("DYNAMODB_USERS_TABLE is not defined in environment variables");
}

// POST /api/users/:id/password/reset
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await getVerifiedTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingUser = await db.get<User>(USERS_TABLE, { 
      userId: params.id,
      tenantId 
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existingUser.authMethod !== "Password") {
      return NextResponse.json(
        { error: "Cannot reset password for non-password users" },
        { status: 400 }
      );
    }

    // Generate a new temporary password
    const tempPassword = crypto.randomBytes(8).toString("base64");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update user with new password and force change
    const updates = {
      metadata: {
        ...existingUser.metadata,
        hashedPassword,
        mustChangePassword: true,
        tempPassword,
        lastPasswordChange: Date.now(),
      },
      updatedAt: Date.now(),
      updatedBy: request.headers.get("x-user-id") || "system",
    };

    await db.update(USERS_TABLE, { userId: params.id, tenantId }, updates);

    return NextResponse.json({ tempPassword });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
} 