import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { CreateShortenedUrlInput } from "@/types/shortened-url";
import { customAlphabet } from 'nanoid';

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_SHORTENED_URLS_TABLE!;

// Generate a URL-safe, 5-character code using numbers and lowercase letters
const generateCode = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 5);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const tenantId = request.headers.get("x-tenant-id");
    const userId = request.headers.get("x-user-id");

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 }
      );
    }

    if (!caseId) {
      return NextResponse.json(
        { error: "Case ID is required" },
        { status: 400 }
      );
    }

    console.log('Fetching shortened URL for case:', caseId);

    // Query by case ID using the GSI
    const result = await db.query(
      TABLE_NAME,
      {
        IndexName: "byCaseId",
        KeyConditionExpression: "caseId = :caseId",
        ExpressionAttributeValues: {
          ":caseId": caseId,
        },
      }
    );

    console.log('Query result:', result);

    return NextResponse.json({
      items: result.items || [],
    });
  } catch (error) {
    console.error("Error fetching shortened URLs:", error);
    return NextResponse.json(
      { error: "Failed to fetch shortened URLs" },
      { status: 500 }
    );
  }
}

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

    const input: CreateShortenedUrlInput = await request.json();

    // Validate input
    if (!input.caseId || !input.websiteTemplateId ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate a unique code
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

    const timestamp = new Date().toISOString();
    const shortenedUrl = {
      code,
      tenantId: tenantId,
      caseId: input.caseId,
      websiteTemplateId: input.websiteTemplateId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.put({ tableName: TABLE_NAME, item: shortenedUrl });

    return NextResponse.json(shortenedUrl, { status: 201 });
  } catch (error) {
    console.error("Error creating shortened URL:", error);
    return NextResponse.json(
      { error: "Failed to create shortened URL" },
      { status: 500 }
    );
  }
} 