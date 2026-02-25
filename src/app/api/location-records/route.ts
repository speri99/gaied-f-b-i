import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";

const dynamoDB = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_CONTACT_RECORDS_TABLE;

interface DynamoDBItem {
  id: string;
  identifier: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  accuracy: number;
  provider: string;
  status: string;
}

interface DynamoDBResponse {
  Item?: DynamoDBItem;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phoneNumber = searchParams.get("phoneNumber");
    const recordId = searchParams.get("recordId");

    // If recordId is provided, fetch a specific record with location data
    if (recordId) {
      console.log('Fetching record with ID:', recordId); // Debug log
      
      const result = await dynamoDB.get(TABLE_NAME, { id: recordId }) as DynamoDBResponse;
      console.log('DynamoDB result:', result); // Debug log
      
      if (!result || !result.Item) {
        return NextResponse.json(
          { error: "Record not found" },
          { status: 404 }
        );
      }

      // TODO: Add permission check here
      // For now, we'll just return the data
      return NextResponse.json(result.Item);
    }

    // For list query, phone number is required
    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required for list query" },
        { status: 400 }
      );
    }

    // For list query, use scan with filter expression and exclude sensitive data
    const filterExpression = "identifier = :phoneNumber";
    const expressionValues = {
      ":phoneNumber": phoneNumber,
    };

    console.log('Scanning with filter:', { filterExpression, expressionValues }); // Debug log
    const result = await dynamoDB.scan(
      TABLE_NAME,
      filterExpression,
      expressionValues
    );
    console.log('Scan result:', result); // Debug log

    // Always exclude sensitive data from list results
    const sanitizedItems = result.items.map((item: DynamoDBItem) => {
      console.log('Processing item for sanitization:', item); // Debug log
      return {
        id: item.id,
        identifier: item.identifier,
        timestamp: item.timestamp,
        accuracy: item.accuracy,
        provider: item.provider,
        status: item.status,
      };
    });

    console.log('Sanitized items:', sanitizedItems); // Debug log
    return NextResponse.json(sanitizedItems || []);
  } catch (error) {
    console.error("Error fetching location records:", error);
    return NextResponse.json(
      { error: "Failed to fetch location records" },
      { status: 500 }
    );
  }
} 