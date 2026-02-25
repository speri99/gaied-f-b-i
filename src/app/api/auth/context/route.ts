import { NextResponse } from "next/server";
import { createAuthenticatedRoute } from "@/middleware/auth";
import type { AuthenticatedRequest } from "@/middleware/auth";

async function getAuthContext(request: AuthenticatedRequest) {
  try {
    return NextResponse.json({
      tenantId: request.user.tenantId,
      userId: request.user.userId,
      email: request.user.email
    });
  } catch (error) {
    console.error("Error getting auth context:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = createAuthenticatedRoute(getAuthContext); 