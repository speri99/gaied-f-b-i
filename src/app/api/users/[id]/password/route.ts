import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { User } from "@/types/user";
import bcrypt from "bcryptjs";
import { getVerifiedTenantId } from "@/lib/utils/tenant-verify";

const db = new DynamoDBService();
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || "GEO-Users";

if (!USERS_TABLE) {
  throw new Error("DYNAMODB_USERS_TABLE is not defined in environment variables");
}

// PATCH /api/users/:id/password (reset password)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }
    // Scan for the user by userId (since we don't have tenantId)
    const scanResult = await db.scan<User>(
      USERS_TABLE,
      "userId = :userId",
      { ":userId": params.id }
    );
    if (!scanResult || !scanResult.items || scanResult.items.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const user = scanResult.items[0];
    if (user.status !== "Active") {
      return NextResponse.json({ error: "User is not active" }, { status: 403 });
    }
    const tenantId = user.tenantId;
    const hashedPassword = await bcrypt.hash(password, 10);
    const updates = {
      metadata: {
        ...user.metadata,
        hashedPassword,
        mustChangePassword: false,
        tempPassword: undefined,
        lastPasswordChange: Date.now(),
      },
      updatedAt: new Date().toISOString(),
      updatedBy: request.headers.get("x-user-id") || "system",
    };
    await db.update(USERS_TABLE, { userId: params.id, tenantId }, updates);
    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
} 