import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error");
  
  // Log the error for debugging
  console.error("Auth error:", error);
  
  // Redirect to login page with error message
  const loginUrl = new URL("/", request.url);
  loginUrl.searchParams.set("error", error || "Authentication failed");
  
  return NextResponse.redirect(loginUrl);
} 