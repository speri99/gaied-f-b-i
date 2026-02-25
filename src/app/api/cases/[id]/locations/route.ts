import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { getServerAuthContext } from "@/lib/server-auth";
import { checkPermissions } from "@/middleware/permissions";
import { Case } from "@/types/case";

const db = new DynamoDBService();
const CASES_TABLE = process.env.DYNAMODB_CASE_RECORDS_TABLE || "GEO-CaseRecords";
const LOCATIONS_TABLE = process.env.DYNAMODB_LOCATION_RECORDS_TABLE || "GEO-LocationRecords-New";
const CONTACTS_TABLE = process.env.DYNAMODB_CONTACT_RECORDS_TABLE || "GEO-ContactRecords";

// Debug environment variables
console.log('API Route Environment Variables:', {
  CASES_TABLE,
  LOCATIONS_TABLE,
  CONTACTS_TABLE
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = getServerAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const { tenantId, userId } = authContext;

    console.log(`Fetching locations for case ${params.id}`);

    // Check permissions for location access
    const hasLocationPermission = await checkPermissions(userId, tenantId, ["read:locations"]);
    if (!hasLocationPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

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

    // Get the victim's phone number
    const phoneNumber = caseRecord.VictimPhone;
    if (!phoneNumber) {
      console.log('No phone number found for case');
      return NextResponse.json({ locations: [] });
    }

    console.log(`Using phone number: ${phoneNumber}`);

    // First, fetch all contact attempts for this case
    console.log(`Fetching contacts for phone: ${phoneNumber}`);
    const contactsResult = await db.scan(
      CONTACTS_TABLE,
      "identifier = :phoneNumber AND tenantId = :tenantId",
      { 
        ":phoneNumber": phoneNumber,
        ":tenantId": tenantId
      }
    );

    const contacts = contactsResult.items || [];
    console.log(`Found ${contacts.length} contacts for this case`);
    
    // Get the time range from the contacts
    const timestamps = contacts
      .map(c => {
        // Handle different timestamp formats
        if (typeof c.timestamp === 'string') {
          return new Date(c.timestamp).getTime();
        } else if (typeof c.timestamp === 'number') {
          return c.timestamp;
        } else {
          console.log(`Invalid timestamp format for contact ${c.UUID}:`, c.timestamp);
          return null;
        }
      })
      .filter(Boolean) as number[];
    
    if (timestamps.length === 0) {
      console.log('No valid timestamps found in contacts');
      return NextResponse.json({ locations: [] });
    }

    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    
    // Safely format timestamps for logging
    const formatTimestamp = (ts: number) => {
      try {
        return new Date(ts).toISOString();
      } catch (e) {
        return `Invalid timestamp: ${ts}`;
      }
    };
    
    console.log(`Time range for contacts: ${formatTimestamp(minTimestamp)} to ${formatTimestamp(maxTimestamp)}`);

    // Fetch locations within the time range of contact attempts
    console.log(`Fetching locations for phone: ${phoneNumber} within time range`);
    
    // First, get all locations for this phone number and tenant
    const result = await db.scan(
      LOCATIONS_TABLE,
      "identifier = :phoneNumber AND tenantId = :tenantId",
      { 
        ":phoneNumber": phoneNumber,
        ":tenantId": tenantId
      }
    );

    console.log(`Found ${result.items?.length || 0} locations for phone ${phoneNumber} and tenant ${tenantId}`);

    // Log all unique identifiers found in the results
    const uniqueIdentifiers = new Set((result.items || []).map(item => item.identifier));
    console.log("Unique identifiers found in results:", Array.from(uniqueIdentifiers));

    // Log all unique tenant IDs found in the results
    const uniqueTenantIds = new Set((result.items || []).map(item => item.tenantId));
    console.log("Unique tenant IDs found in results:", Array.from(uniqueTenantIds));

    // Filter locations by timestamp in memory and verify phone number
    const filteredLocations = (result.items || []).filter(location => {
      // Log the raw location data for debugging
      console.log("Raw location data:", {
        identifier: location.identifier,
        tenantId: location.tenantId,
        timestamp: location.timestamp,
        formattedAddress: location.formattedAddress,
        state: location.state
      });

      // Verify tenant ID and phone number again as a safety check
      if (location.tenantId !== tenantId) {
        console.log(`Filtering out location with wrong tenant ID:`, {
          locationTenantId: location.tenantId,
          expectedTenantId: tenantId,
          locationPhone: location.identifier,
          expectedPhone: phoneNumber,
          formattedAddress: location.formattedAddress,
          state: location.state
        });
        return false;
      }

      // Verify phone number matches
      if (location.identifier !== phoneNumber) {
        console.log(`Filtering out location with wrong phone number:`, {
          locationTenantId: location.tenantId,
          expectedTenantId: tenantId,
          locationPhone: location.identifier,
          expectedPhone: phoneNumber,
          formattedAddress: location.formattedAddress,
          state: location.state
        });
        return false;
      }

      const locationTime = typeof location.timestamp === 'string' 
        ? new Date(location.timestamp).getTime() 
        : (typeof location.timestamp === 'number' ? location.timestamp : 0);
      
      return locationTime >= minTimestamp && locationTime <= maxTimestamp;
    });

    // Log the first few locations after filtering
    console.log(`After filtering by phone number and time range: ${filteredLocations.length} locations`);
    if (filteredLocations.length > 0) {
      console.log("First few filtered locations:", filteredLocations.slice(0, 3).map(loc => ({
        identifier: loc.identifier,
        tenantId: loc.tenantId,
        timestamp: loc.timestamp,
        formattedAddress: loc.formattedAddress,
        state: loc.state
      })));
    }

    // Group locations by address and timestamp (within 5 seconds)
    const locationGroups = new Map();
    filteredLocations.forEach(location => {
      const locationTime = typeof location.timestamp === 'string' 
        ? new Date(location.timestamp).getTime() 
        : (typeof location.timestamp === 'number' ? location.timestamp : 0);
      
      // Round timestamp to nearest 5 seconds to group nearby timestamps
      const roundedTime = Math.round(locationTime / 5000) * 5000;
      const address = location.formattedAddress;
      const key = `${roundedTime}-${address}`;
      
      if (!locationGroups.has(key)) {
        locationGroups.set(key, []);
      }
      locationGroups.get(key).push(location);
    });

    // For each group, take the location with the most accurate coordinates
    const uniqueLocations = Array.from(locationGroups.values()).map(group => {
      // Sort by timestamp to get the most recent one
      group.sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
        const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
        return timeB - timeA;
      });
      return group[0]; // Take the most recent location from each group
    });

    console.log(`After deduplication: ${uniqueLocations.length} unique locations`);

    // Log all unique addresses for debugging
    const uniqueAddresses = new Set(uniqueLocations.map(loc => loc.formattedAddress));
    console.log("Unique addresses found:", Array.from(uniqueAddresses));

    // Map locations to their nearest contact attempt by timestamp
    const locations = uniqueLocations.map(location => {
      // Find the closest contact attempt by timestamp
      const closestContact = contacts.reduce((closest, contact) => {
        const contactTime = typeof contact.timestamp === 'string' 
          ? new Date(contact.timestamp).getTime() 
          : (typeof contact.timestamp === 'number' ? contact.timestamp : 0);
        
        const locationTime = typeof location.timestamp === 'string' 
          ? new Date(location.timestamp).getTime() 
          : (typeof location.timestamp === 'number' ? location.timestamp : 0);
        
        const closestTime = typeof closest.timestamp === 'string' 
          ? new Date(closest.timestamp).getTime() 
          : (typeof closest.timestamp === 'number' ? closest.timestamp : 0);
        
        const currentDiff = Math.abs(contactTime - locationTime);
        const closestDiff = Math.abs(closestTime - locationTime);
        
        return currentDiff < closestDiff ? contact : closest;
      }, contacts[0]);

      return {
        UUID: location.UUID,
        contactUUID: closestContact.UUID,
        timestamp: location.timestamp,
        formattedAddress: location.formattedAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        tenantId: location.tenantId
      };
    });

    console.log(`Returning ${locations.length} unique locations for tenant ${tenantId}`);
    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Error in locations endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
} 