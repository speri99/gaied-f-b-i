import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { getAuthContext } from "@/lib/auth";
import { debug } from "@/lib/debug";

const CONTACTS_TABLE = process.env.DYNAMODB_CONTACT_RECORDS_TABLE;

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = getAuthContext();
    const body = await request.json();
    const { contactIds } = body;

    debug.log("Received request for contact locations:", {
      tenantId,
      userId,
      contactIds,
      contactCount: contactIds?.length,
      body,
      tableName: CONTACTS_TABLE
    });

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      debug.error("Invalid request: contactIds must be a non-empty array");
      return NextResponse.json(
        { error: "Invalid request: contactIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const dynamoDB = new DynamoDBService();
    const locations = new Map();

    try {
      // Since UUID is the partition key, we need to use getItem for each contact
      const locationPromises = contactIds.map(async (contactId) => {
        try {
          const result = await dynamoDB.getItem(CONTACTS_TABLE, {
            UUID: contactId
          });

          if (result && result.latitude && result.longitude) {
            debug.log(`Found valid location for contact ${contactId}:`, {
              latitude: result.latitude,
              longitude: result.longitude,
              formattedAddress: result.formattedAddress
            });
            locations.set(contactId, {
              UUID: contactId,
              latitude: result.latitude,
              longitude: result.longitude,
              formattedAddress: result.formattedAddress,
              timestamp: result.timestamp
            });
          } else {
            debug.log(`Skipping contact ${contactId} - missing data:`, {
              hasLatitude: !!result?.latitude,
              hasLongitude: !!result?.longitude
            });
          }
        } catch (err) {
          debug.error(`Error fetching location for contact ${contactId}:`, err);
        }
      });

      await Promise.all(locationPromises);

      debug.log("Completed processing locations:", {
        totalContacts: contactIds.length,
        foundLocations: locations.size,
        locations: Object.fromEntries(locations)
      });

      return NextResponse.json({
        locations: Object.fromEntries(locations)
      });
    } catch (dbError) {
      debug.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Database error", details: dbError instanceof Error ? dbError.message : "Unknown error" },
        { status: 500 }
      );
    }
  } catch (error) {
    debug.error("General error in POST handler:", error);
    return NextResponse.json(
      { 
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 