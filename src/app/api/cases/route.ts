import { NextRequest, NextResponse } from "next/server";
import { createValidatedRoute } from "@/middleware/validation";
import { createCaseSchema, updateCaseSchema } from "@/lib/validations";
import { getVerifiedTenantId } from "@/lib/utils/tenant-verify";
import { CaseService } from "@/lib/services/case.service";

// GET /api/cases
export async function GET(request: NextRequest) {
  try {
    // Get the verified tenant ID from the middleware
    const tenantId = getVerifiedTenantId(request);
    
    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const filter = {
      limit: parseInt(searchParams.get("limit") || "10"),
      lastKey: searchParams.get("lastKey"),
      includeDeleted: searchParams.get("includeDeleted") === "true",
      status: searchParams.getAll("status"),
      priority: searchParams.getAll("priority"),
      caseType: searchParams.getAll("caseType"),
      search: searchParams.get("search") || undefined,
      dateRange: searchParams.get("dateRange") 
        ? JSON.parse(searchParams.get("dateRange")!)
        : undefined,
    };
    
    // Use the verified tenant ID to fetch cases
    const cases = await CaseService.getCases(tenantId, filter);
    
    return NextResponse.json(cases);
  } catch (error) {
    console.error('Error fetching cases:', error);
    if (error instanceof Error && error.message === 'Missing verified tenant ID') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}

// POST /api/cases
export async function POST(request: NextRequest) {
  try {
    // Get the verified tenant ID from the middleware
    const tenantId = getVerifiedTenantId(request);
    
    const body = await request.json();
    const validated = createCaseSchema.parse(body);
    
    // Ensure the case is created for the correct tenant
    const caseData = {
      ...validated,
      tenantId, // Override any tenantId in the request body
      userId: request.headers.get("x-user-id") || "system",
    };
    
    const newCase = await CaseService.createCase(caseData,tenantId);
    
    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    console.error('Error creating case:', error);
    if (error instanceof Error && error.message === 'Missing verified tenant ID') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}

// PATCH /api/cases/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the verified tenant ID from the middleware
    const tenantId = getVerifiedTenantId(request);
    
    const body = await request.json();
    const validated = updateCaseSchema.parse(body);
    
    const updatedCase = await CaseService.updateCase(params.id, {
      ...validated,
      tenantId,
      userId: request.headers.get("x-user-id") || "system",
    });
    
    return NextResponse.json(updatedCase);
  } catch (error) {
    console.error('Error updating case:', error);
    if (error instanceof Error && error.message === 'Missing verified tenant ID') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}

// DELETE /api/cases/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the verified tenant ID from the middleware
    const tenantId = getVerifiedTenantId(request);
    const userId = request.headers.get("x-user-id") || "system";
    
    await CaseService.deleteCase(params.id, tenantId, userId);
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting case:', error);
    if (error instanceof Error && error.message === 'Missing verified tenant ID') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}
