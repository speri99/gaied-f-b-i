import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { customAlphabet } from 'nanoid';

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_SHORTENED_URLS_TABLE!;

// Generate a URL-safe, 5-character code using numbers and lowercase letters
const generateCode = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 5);

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const userId = request.headers.get("x-user-id");

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 }
      );
    }

    let isUnique = false;
    let code = '';

    while (!isUnique) {
      code = generateCode();
      try {
        // Check if code exists
        const result = await db.get(TABLE_NAME, { code });

        if (!result) {
          isUnique = true;
        }
      } catch (error) {
        console.error('Error checking code uniqueness:', error);
        throw error;
      }
    }

    return NextResponse.json({ code });
  } catch (error) {
    console.error("Error generating unique code:", error);
    return NextResponse.json(
      { error: "Failed to generate unique code" },
      { status: 500 }
    );
  }
} 