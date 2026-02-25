import { NextRequest, NextResponse } from "next/server";
import { CasePhoneIndexService } from "@/lib/services/case-phone-index.service";
import { DynamoDBService } from "@/lib/dynamodb";
import { normalizePhoneNumber } from "@/lib/utils";

const db = new DynamoDBService();
const CASE_TABLE = process.env.DYNAMODB_CASE_RECORDS_TABLE!;

export async function GET(request: NextRequest) {
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

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhoneNumber) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Find all cases associated with this phone number
    const phoneIndex = await CasePhoneIndexService.getCaseByPhoneNumber(tenantId, normalizedPhoneNumber);
    
    if (!phoneIndex) {
      return NextResponse.json({ cases: [] });
    }

    // Get the case details
    const caseRecord = await db.get(CASE_TABLE, { Identifier: phoneIndex.caseId });
    
    if (!caseRecord) {
      return NextResponse.json({ cases: [] });
    }

    return NextResponse.json({
      cases: [{
        caseId: caseRecord.Identifier,
        phoneNumber: phoneIndex.phoneNumber,
        isPrimary: phoneIndex.isPrimary,
        label: phoneIndex.label,
        caseDetails: caseRecord
      }]
    });
  } catch (error) {
    console.error("Error searching cases by phone number:", error);
    return NextResponse.json(
      { error: "Failed to search cases by phone number" },
      { status: 500 }
    );
  }
} 