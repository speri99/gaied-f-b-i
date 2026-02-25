import { NextResponse } from "next/server";
import { docClient, TABLES } from "@/lib/db";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { createAuthenticatedRoute } from "@/middleware/auth";
import type { AuthenticatedRequest } from "@/middleware/auth";

interface DynamoDBError extends Error {
  code?: string;
}

async function getDashboardStats(request: AuthenticatedRequest) {
  try {
    const tenantId = request.user.tenantId;

    // Validate table names
    if (!TABLES.CASES || !TABLES.CONTACTS) {
      console.error("Missing table names:", {
        cases: TABLES.CASES,
        contacts: TABLES.CONTACTS,
      });
      return NextResponse.json(
        { error: "Database configuration error" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "24h";

    // Calculate the timestamp for the time range
    const now = Date.now();
    let startTime = now;
    switch (timeRange) {
      case "24h":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "7d":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "all":
        startTime = 0;
        break;
    }

    console.log("Time range:", {
      range: timeRange,
      startTime: new Date(startTime).toISOString(),
      now: new Date(now).toISOString(),
    });

    // Get cases
    let cases = [];
    try {
      console.log("Fetching cases from table:", TABLES.CASES);
      const casesCommand = new ScanCommand({
        TableName: TABLES.CASES,
        FilterExpression: "tenantId = :tenantId",
        ExpressionAttributeValues: {
          ":tenantId": tenantId
        }
      });
      const casesResult = await docClient.send(casesCommand);
      cases = casesResult.Items || [];
      console.log(`Successfully fetched ${cases.length} cases for tenant ${tenantId}`);
    } catch (error) {
      console.error("Error fetching cases:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        if ((error as DynamoDBError).code) {
          console.error("Error code:", (error as DynamoDBError).code);
        }
      }
      cases = [];
    }

    // Get contacts
    let contacts = [];
    try {
      console.log("Fetching contacts from table:", TABLES.CONTACTS);
      
      // First, let's fetch all contacts for the tenant to debug timestamp formats
      const contactsCommand = new ScanCommand({
        TableName: TABLES.CONTACTS,
        FilterExpression: "tenantId = :tenantId",
        ExpressionAttributeValues: {
          ":tenantId": tenantId
        }
      });
      
      const contactsResult = await docClient.send(contactsCommand);
      const allContacts = contactsResult.Items || [];
      console.log(`Successfully fetched ${allContacts.length} total contacts for tenant ${tenantId}`);

      // Log sample timestamps to understand the format
      if (allContacts.length > 0) {
        console.log("Sample contact timestamps:", allContacts.slice(0, 3).map(c => ({
          original: c.timestamp,
          type: typeof c.timestamp,
          parsed: typeof c.timestamp === 'string' ? new Date(c.timestamp).getTime() : c.timestamp
        })));
      }

      // Filter contacts by timestamp
      contacts = allContacts.filter(contact => {
        try {
          let contactTimestamp = contact.timestamp;

          // If it's a string that looks like an ISO date, convert it to milliseconds
          if (typeof contactTimestamp === 'string') {
            if (contactTimestamp.includes('T')) {
              contactTimestamp = new Date(contactTimestamp).getTime();
            } else {
              contactTimestamp = parseInt(contactTimestamp, 10);
            }
          }

          // If the timestamp is in seconds, convert to milliseconds
          if (contactTimestamp < 1000000000000) {
            contactTimestamp *= 1000;
          }

          if (isNaN(contactTimestamp)) {
            console.warn("Invalid timestamp for contact:", {
              contact,
              parsedTimestamp: contactTimestamp
            });
            return false;
          }

          const isRecent = contactTimestamp >= startTime;
          if (!isRecent) {
            console.log("Filtered out contact:", {
              contactTime: new Date(contactTimestamp).toISOString(),
              startTime: new Date(startTime).toISOString(),
              timestamp: contactTimestamp,
              threshold: startTime
            });
          }
          return isRecent;
        } catch (err) {
          console.warn("Error processing contact:", contact, err);
          return false;
        }
      });
      console.log(`Filtered to ${contacts.length} recent contacts for tenant ${tenantId}`);

      // Calculate daily incidents for the past 30 days
      const dailyIncidents = Array.from({ length: 30 }, (_, i) => {
        const dayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
        const dayEnd = now - i * 24 * 60 * 60 * 1000;

        const dayContacts = allContacts.filter(contact => {
          try {
            let contactTimestamp = contact.timestamp;

            // If it's a string that looks like an ISO date, convert it to milliseconds
            if (typeof contactTimestamp === 'string') {
              if (contactTimestamp.includes('T')) {
                contactTimestamp = new Date(contactTimestamp).getTime();
              } else {
                contactTimestamp = parseInt(contactTimestamp, 10);
              }
            }

            // If the timestamp is in seconds, convert to milliseconds
            if (contactTimestamp < 1000000000000) {
              contactTimestamp *= 1000;
            }

            if (isNaN(contactTimestamp)) {
              return false;
            }

            return contactTimestamp >= dayStart && contactTimestamp < dayEnd;
          } catch (err) {
            return false;
          }
        });

        return {
          date: new Date(dayStart).toISOString().split('T')[0],
          count: dayContacts.length
        };
      }).reverse();

      // Calculate stats
      const stats = {
        totalCases: cases.length,
        activeCases: cases.filter(c => c.status === "active").length,
        pendingCases: cases.filter(c => c.status === "pending").length,
        closedCases: cases.filter(c => c.status === "closed").length,
        recentContacts: contacts.length,
        dispatchedContacts: contacts.filter(c => c.dispatched).length,
        dailyIncidents
      };

      return NextResponse.json(stats);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        if ((error as DynamoDBError).code) {
          console.error("Error code:", (error as DynamoDBError).code);
        }
      }
      return NextResponse.json(
        { error: "Failed to fetch contacts data" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in dashboard stats:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      if ((error as DynamoDBError).code) {
        console.error("Error code:", (error as DynamoDBError).code);
      }
    }
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}

export const GET = createAuthenticatedRoute(getDashboardStats);
