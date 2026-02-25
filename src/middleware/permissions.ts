import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { Permission as SectionPermission, SecurityProfile } from "@/types/security-profile";
import { User } from "@/types/user";
import { getAuthContext } from "@/lib/auth";

const db = new DynamoDBService();

// Map from API permission format to section permission level
function mapPermissionLevel(action: string): SectionPermission {
  switch (action) {
    case "write":
      return "write";
    case "read":
      return "read";
    default:
      return "none";
  }
}

// Map from ViewCases format to read:cases format
function mapPermissionFormat(permission: string): string {
  // Handle ViewCases format
  if (permission.startsWith("View")) {
    const resource = permission.substring(4).toLowerCase();
    return `read:${resource}`;
  }
  
  // Handle EditCases format
  if (permission.startsWith("Edit")) {
    const resource = permission.substring(4).toLowerCase();
    return `write:${resource}`;
  }
  
  // Handle CreateCases format
  if (permission.startsWith("Create")) {
    const resource = permission.substring(6).toLowerCase();
    return `write:${resource}`;
  }
  
  // Handle DeleteCases format
  if (permission.startsWith("Delete")) {
    const resource = permission.substring(6).toLowerCase();
    return `delete:${resource}`;
  }
  
  // If it's already in the correct format, return as is
  return permission;
}

export const PERMISSIONS = {
  // Case permissions
  "read:cases": "Read case details",
  "write:cases": "Create and update cases",
  "delete:cases": "Delete cases",
  
  // Contact permissions
  "read:contacts": "Read contact history",
  "write:contacts": "Create and update contacts",
  
  // Location permissions
  "read:locations": "View location data",
  
  // User permissions
  "read:users": "View user details",
  "write:users": "Create and update users",
  
  // Website template permissions
  "read:website-templates": "View website templates",
  "write:website-templates": "Create and update website templates",
  
  // Note permissions
  "read:notes": "View notes",
  "write:notes": "Create and update notes",
  
  // Summary permissions
  "read:summaries": "View case summaries",
  "write:summaries": "Generate case summaries"
} as const;

export async function checkPermissions(
  userId: string,
  tenantId: string,
  requiredPermissions: string[],
  resourceId?: string
): Promise<boolean> {
  try {
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

    // For each required permission, check if any profile grants it
    for (const requiredPermission of requiredPermissions) {
      // Map the permission to the correct format if needed
      const mappedPermission = mapPermissionFormat(requiredPermission);
      
      // Parse the permission into action and resource
      const [action, resource] = mappedPermission.split(":");
      if (!action || !resource) {
        console.warn(`Invalid permission format: ${mappedPermission}`);
        return false;
      }

      // Check if any profile grants this permission
      let hasPermission = false;
      for (const profileId of profileIds) {
        // Use the ProfileIdIndex to look up the profile
        const profileResponse = await db.query<SecurityProfile>(PROFILES_TABLE, {
          IndexName: "ProfileIdIndex",
          KeyConditionExpression: "profileId = :profileId",
          ExpressionAttributeValues: {
            ":profileId": profileId,
          },
        });

        if (profileResponse.items?.length) {
          const profile = profileResponse.items[0];
          if (profile.status === "Active" && profile.permissions) {
            // Get the permission level for this resource
            const resourceKey = resource as keyof typeof profile.permissions;
            const permissionLevel = profile.permissions[resourceKey];
            const requiredLevel = mapPermissionLevel(action);
            
            // Check if the permission level is sufficient
            if (
              permissionLevel === "write" || 
              (permissionLevel === "read" && requiredLevel === "read")
            ) {
              hasPermission = true;
              break;
            }
          }
        }
      }

      if (!hasPermission) {
        console.warn(`User ${userId} lacks permission: ${mappedPermission}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
}

export async function logSensitiveAccess(
  userId: string,
  resourceId: string,
  action: "view" | "export" | "modify",
  reason: string,
  tenantId: string
): Promise<void> {
  try {
    const accessLog = {
      id: crypto.randomUUID(),
      userId,
      resourceId,
      timestamp: new Date().toISOString(),
      action,
      reason,
      tenantId,
      ipAddress: "", // To be filled by the API route
      userAgent: "", // To be filled by the API route
    };

    // Use the existing action logs table
    const ACTION_LOGS_TABLE = process.env.DYNAMODB_ACTION_LOGS_TABLE || "GEO-ActionLogTable";
    
    // Store the access log in the action logs table
    await db.put({
      tableName: ACTION_LOGS_TABLE,
      item: accessLog
    });
  } catch (error) {
    console.error("Error logging sensitive access:", error);
    throw error;
  }
}

// Helper function to create a permission-protected API route
export function createProtectedRoute(
  handler: (request: NextRequest, context?: { params: { [key: string]: string } }) => Promise<NextResponse>,
  requiredPermissions: string[]
) {
  return withPermissions(handler, requiredPermissions);
}

export function withPermissions(
  handler: (request: NextRequest, context?: { params: { [key: string]: string } }) => Promise<NextResponse>,
  requiredPermissions: string[]
) {
  return async (request: NextRequest, context?: { params: { [key: string]: string } }) => {
    try {
      // Get user ID from session/token
      const { userId, tenantId } = getAuthContext();
      // const userId = request.headers.get("x-user-id");
      if (!userId) {
        return new NextResponse(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401 }
        );
      }

      // Check permissions
      const hasPermission = await checkPermissions(userId, tenantId, requiredPermissions);
      if (!hasPermission) {
        return new NextResponse(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403 }
        );
      }

      // Call the handler if permissions are valid
      return handler(request, context);
    } catch (error) {
      console.error("Error in permission middleware:", error);
      return new NextResponse(
        JSON.stringify({ error: "Internal Server Error" }),
        { status: 500 }
      );
    }
  };
} 