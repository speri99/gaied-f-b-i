import { NextResponse } from "next/server";
import { createAuthenticatedRoute } from "@/middleware/auth";
import type { AuthenticatedRequest } from "@/middleware/auth";

async function getCurrentUser(request: AuthenticatedRequest) {
  try {
    return NextResponse.json({ user: request.user });
  } catch (error) {
    console.error("Error getting current user:", error);
    return NextResponse.json(
      { error: "Failed to get user information" },
      { status: 500 }
    );
  }
}

export const GET = createAuthenticatedRoute(getCurrentUser); 