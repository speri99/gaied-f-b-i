import { NextRequest, NextResponse } from "next/server";
import { CasePhoneIndexService } from "@/lib/services/case-phone-index.service";
import { normalizePhoneNumber } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const userId = request.headers.get("x-user-id");

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 }
      );
    }

    const caseId = params.id;
    const phoneNumbers = await CasePhoneIndexService.getPhoneNumbersByCaseId(tenantId, caseId);
    
    return NextResponse.json({ phoneNumbers });
  } catch (error) {
    console.error("Error fetching case phone numbers:", error);
    return NextResponse.json(
      { error: "Failed to fetch case phone numbers" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const userId = request.headers.get("x-user-id");

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 }
      );
    }

    const caseId = params.id;
    const { phoneNumber, isPrimary, label } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const phoneIndex = await CasePhoneIndexService.addPhoneNumber(
      tenantId,
      caseId,
      phoneNumber,
      isPrimary,
      label
    );

    return NextResponse.json(phoneIndex, { status: 201 });
  } catch (error) {
    console.error("Error adding case phone number:", error);
    return NextResponse.json(
      { error: "Failed to add case phone number" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const userId = request.headers.get("x-user-id");

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");
    const caseId = params.id;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    await CasePhoneIndexService.removePhoneNumber(tenantId, phoneNumber);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing case phone number:", error);
    return NextResponse.json(
      { error: "Failed to remove case phone number" },
      { status: 500 }
    );
  }
} 