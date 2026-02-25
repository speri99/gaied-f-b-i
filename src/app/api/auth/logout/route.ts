import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return 'default-secret-key-for-development';
  return secret;
};
const JWT_SECRET = new TextEncoder().encode(getJwtSecret());

export async function POST() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;
    let tenantId = undefined;
    let userId = undefined;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ['HS256'] });
        tenantId = payload.tenantId as string;
        userId = payload.sub as string;
      } catch (e) {
        // ignore
      }
    }
    cookieStore.delete("token");

    // Log the logout action if we have tenantId and userId
    if (tenantId && userId) {
      try {
        const { logAction } = await import("@/lib/logging");
        await logAction({
          tenantId,
          userId,
          action: "logout",
        });
      } catch (logError) {
        console.error("Failed to log logout action:", logError);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 