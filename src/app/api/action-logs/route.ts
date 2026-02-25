import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { checkPermissions } from "@/middleware/permissions";
import { ActionLogService } from "@/lib/services/action-log.service";
import { debug } from "@/lib/debug";

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = getAuthContext();
    
    // Check permissions
    const hasPermission = await checkPermissions(userId, tenantId, ["ViewCases"]);
    
    if (!hasPermission) {
      debug.error('Permission denied for action logging:', { userId, tenantId });
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const actionData = await request.json();
    
    // Validate required fields
    if (!actionData.entityId || !actionData.entityType || !actionData.action) {
      return NextResponse.json(
        { error: "Missing required fields: entityId, entityType, action" },
        { status: 400 }
      );
    }

    // Log the action
    await ActionLogService.logAction({
      tenantId,
      userId,
      entityId: actionData.entityId,
      entityType: actionData.entityType,
      action: actionData.action,
      details: actionData.details || {}
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    debug.error("Error logging action:", error);
    return NextResponse.json(
      { error: "Failed to log action" },
      { status: 500 }
    );
  }
} 