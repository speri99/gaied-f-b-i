import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { ContactRecord, ContactNote } from "@/types/contact";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_CONTACT_RECORDS_TABLE;

// Validation schema for note creation
const createNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = createNoteSchema.parse(body);
    
    const contact = await db.get<ContactRecord>(TABLE_NAME!, { UUID: params.id });
    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const now = Date.now();
    const userId = request.headers.get("x-user-id");

    const newNote: ContactNote = {
      id: uuidv4(),
      content: validated.content,
      createdAt: now,
      createdBy: userId || "system",
    };

    // Add the new note to the contact's notes array
    const updates = {
      acknowledgment: {
        ...contact.acknowledgment,
        notes: [...(contact.acknowledgment.notes || []), newNote],
      },
    };

    await db.update<ContactRecord>(
      TABLE_NAME!,
      { UUID: params.id },
      updates
    );

    return NextResponse.json(newNote);
  } catch (error) {
    console.error("Error adding note:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid note data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to add note" },
      { status: 500 }
    );
  }
} 