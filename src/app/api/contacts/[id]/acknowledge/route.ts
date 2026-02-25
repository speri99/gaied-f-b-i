import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { ContactRecord, AcknowledgmentStatus, EscalationLevel, ContactNote } from "@/types/contact";
import { z } from "zod";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_CONTACT_RECORDS_TABLE;

// Validation schema for the request body
const acknowledgeSchema = z.object({
  note: z.string().min(1, "Note is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!TABLE_NAME) {
      throw new Error("DYNAMODB_CONTACT_RECORDS_TABLE is not defined");
    }

    // Validate request body
    const body = await request.json();
    const { note } = acknowledgeSchema.parse(body);
    const tenantId = request.headers.get('x-tenant-id');//x-tenant-id

    // const contact = await db.get<ContactRecord>(TABLE_NAME, { UUID: params.id });

    const contact:any = await db.query(
      TABLE_NAME,
      {
        KeyConditionExpression: "#u = :uuidVal AND tenantId = :tenantVal",

        // 2. Map placeholder #u to actual attribute name "UUID"
        ExpressionAttributeNames: {
          "#u": "UUID"
        },

        // 3. Provide values for both keys
        ExpressionAttributeValues: {
          ":uuidVal": params.id,
          ":tenantVal": tenantId
        },
      }
    );
    
    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const now = Date.now();
    const userId = request.headers.get("x-user-id") || "system";

    // Create the acknowledgment note
    const acknowledgmentNote: ContactNote = {
      id: crypto.randomUUID(),
      content: note,
      timestamp: now,
      createdBy: userId,
      type: "acknowledgment"
    };

    // Update acknowledgment status
    const updates = {
      acknowledgment: {
        status: "Acknowledged" as AcknowledgmentStatus,
        timestamp: now,
        acknowledgedBy: userId,
        escalationLevel: "Primary" as EscalationLevel,
        lastEscalated: contact.acknowledgment?.lastEscalated,
        notes: [...(contact.acknowledgment?.notes || []), acknowledgmentNote],
      },
      updatedAt: now,
      updatedBy: userId,
    };

    const updatedContact = await db.update<ContactRecord>(
      TABLE_NAME,
      { UUID: params.id ,tenantId: tenantId},
      updates
    );

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error("Error acknowledging contact:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to acknowledge contact" },
      { status: 500 }
    );
  }
} 