import { NextRequest, NextResponse } from "next/server";
import { TenantService } from "@/lib/services/tenant.service";
import { Tenant } from "@/types/tenant";

export async function POST(request: NextRequest) {
  try {
    const tenant = await request.json();
    const newTenant = await TenantService.create(tenant);
    return NextResponse.json(newTenant, { status: 201 });
  } catch (error) {
    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { error: "Failed to create tenant" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const name = searchParams.get("name");

    if (tenantId) {
      const tenant = await TenantService.get(tenantId);
      if (!tenant) {
        return NextResponse.json(
          { error: "Tenant not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(tenant);
    }

    if (name) {
      const tenant = await TenantService.getByName(name);
      if (!tenant) {
        return NextResponse.json(
          { error: "Tenant not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(tenant);
    }

    return NextResponse.json(
      { error: "Either tenantId or name is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant" },
      { status: 500 }
    );
  }
} 