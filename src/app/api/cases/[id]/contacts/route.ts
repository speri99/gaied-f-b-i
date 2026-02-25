import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { getVerifiedTenantId } from "@/lib/utils/tenant-verify";
import { ContactRecord } from "@/types/contact";
import { Case } from "@/types/case";

const db = new DynamoDBService();
const CASES_TABLE = process.env.DYNAMODB_CASE_RECORDS_TABLE || "GEO-CaseRecords";
const CONTACTS_TABLE = process.env.DYNAMODB_CONTACT_RECORDS_TABLE || "GEO-ContactRecords";

// Debug environment variables
console.log('API Route Environment Variables:', {
  USERS_TABLE: process.env.DYNAMODB_USERS_TABLE,
  PROFILES_TABLE: process.env.DYNAMODB_SECURITY_PROFILES_TABLE,
  CASES_TABLE: process.env.DYNAMODB_CASE_RECORDS_TABLE,
  CONTACTS_TABLE: process.env.DYNAMODB_CONTACT_RECORDS_TABLE,
});

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

    console.log(`Fetching contacts for case ${params.id}`);

    // Get the case to find associated phone numbers
    console.log(`Looking up case in ${CASES_TABLE} with Identifier: ${params.id}`);
    const caseRecord = await db.get<Case>(CASES_TABLE, { Identifier: params.id });
    
    if (!caseRecord) {
      console.log(`Case not found with ID: ${params.id}`);
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    // Verify tenant ownership
    if (caseRecord.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get the victim's phone number
    const phoneNumber = caseRecord.VictimPhone;
    if (!phoneNumber) {
      console.log('No phone number found for case');
      return NextResponse.json({ contacts: [] });
    }

    console.log(`Using phone number: ${phoneNumber}`);

    // Fetch contacts for the phone number
    console.log(`Fetching contacts for phone: ${phoneNumber}`);
    const result = await db.scan(
      CONTACTS_TABLE,
      "identifier = :phoneNumber AND tenantId = :tenantId",
      { 
        ":phoneNumber": phoneNumber,
        ":tenantId": tenantId
      }
    );

    console.log(`Found ${result.items?.length || 0} contacts`);
    const allContacts = result.items || [];

    // Convert location records to contact records, excluding sensitive data
    const contacts = allContacts.map((contact: any): ContactRecord => ({
      UUID: contact.UUID,
      caseId: params.id,
      identifier: contact.identifier,
      timestamp: contact.timestamp,
      status: contact.status || "Pending",
      type: contact.type || "Initial",
      metadata: {
        method: contact.method || "Other",
      },
      assignedTo: contact.assignedTo || "",
      backupAssignedTo: contact.backupAssignedTo || "",
      acknowledgment: {
        status: contact.acknowledgment?.status || "Pending",
        escalationLevel: contact.acknowledgment?.escalationLevel || "None",
        notes: contact.acknowledgment?.notes || [],
      }
      // Sensitive location data is not included by default
    }));

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("Error in contacts endpoint:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch contacts" },
      { status: 500 }
    );
  }
} 