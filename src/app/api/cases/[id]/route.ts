import { NextRequest, NextResponse } from "next/server";
import { getVerifiedTenantId } from "@/lib/utils/tenant-verify";
import { CaseService } from "@/lib/services/case.service";
import { createAuthHeaders } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the verified tenant ID from the request headers
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

    // Fetch the case
    const caseData = await CaseService.getCase(params.id, tenantId);
    if (!caseData) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    // Verify the case belongs to the tenant
    if (caseData.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json(caseData);
  } catch (error) {
    console.error("Error fetching case:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const tenantId = getVerifiedTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const caseData = await CaseService.getCase(params.id, tenantId);
    if (!caseData) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    if (caseData.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const updatedCase = await CaseService.updateCase(params.id, {
      ...body,
      tenantId,
      userId: request.headers.get("x-user-id") || "system"
    });

    return NextResponse.json(updatedCase);
  } catch (error) {
    console.error("Error updating case:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = getVerifiedTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const caseData = await CaseService.getCase(params.id, tenantId);
    
    if (!caseData) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    if (caseData.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const updatedCase = await CaseService.updateCase(params.id, {
      ...body,
      tenantId,
      userId
    });

    return NextResponse.json(updatedCase);
  } catch (error) {
    console.error("Error updating case:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
} 