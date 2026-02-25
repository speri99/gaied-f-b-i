import { NextRequest, NextResponse } from "next/server";
import { getVerifiedTenantId } from "@/lib/utils/tenant-verify";

export async function GET(request: NextRequest) {
  try {
    const tenantId = getVerifiedTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user ID from headers
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    // Get resource and action from query parameters
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource");
    const action = url.searchParams.get("action");

    if (!resource || !action) {
      return NextResponse.json(
        { error: "Resource and action are required" },
        { status: 400 }
      );
    }

    // TODO: Implement proper permission checking based on user roles
    // For now, we'll just verify the request is authenticated
    
    return NextResponse.json({
      allowed: true,
      resource,
      action
    });
  } catch (error) {
    console.error("Error checking permissions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = getVerifiedTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user ID from headers
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Handle both old and new permission formats
    if (body.permissions) {
      // New format: { permissions: string[] }
      const permissions = body.permissions as string[];
      if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        return NextResponse.json(
          { error: "Permissions array is required" },
          { status: 400 }
        );
      }

      // For now, grant all permissions
      // TODO: Implement proper permission checking
      return NextResponse.json({
        hasPermission: true,
        permissions: permissions.reduce((acc, permission) => {
          acc[permission] = true;
          return acc;
        }, {} as Record<string, boolean>)
      });
    } else {
      // Old format: { resource: string, action: string }
      const { resource, action } = body;
      if (!resource || !action) {
        return NextResponse.json(
          { error: "Resource and action are required" },
          { status: 400 }
        );
      }

      // TODO: Implement proper permission checking based on user roles
      // For now, we'll just verify the request is authenticated
      
      return NextResponse.json({
        allowed: true,
        resource,
        action
      });
    }
  } catch (error) {
    console.error("Error checking permissions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
} 