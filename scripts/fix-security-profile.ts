import { DynamoDBService } from "@/lib/dynamodb";
import { SecurityProfile } from "@/types/security-profile";
import "dotenv/config";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_SECURITY_PROFILES_TABLE;

if (!TABLE_NAME) {
  throw new Error("DYNAMODB_SECURITY_PROFILES_TABLE is not defined in environment variables");
}

async function fixSecurityProfile() {
  try {
    const profileId = "PROF-a2304e46-6a7f-48ab-9215-0e4eca5a2785";
    const securityProfile: SecurityProfile = {
      profileId,
      tenantId: "TENANT-001",
      name: "Administrator Profile",
      description: "Full system access with all permissions",
      status: "Active",
      permissions: {
        users: "write",
        cases: "write",
        contacts: "write",
        locations: "write",
        reports: "write",
        securityProfiles: "write",
        deletedItems: "write",
        websiteTemplates: "write",
      },
      tags: ["admin"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      updatedBy: "system",
    };

    // Check if profile already exists
    const response = await db.query<SecurityProfile>(
      TABLE_NAME,
      "profileId = :profileId",
      { ":profileId": profileId },
      "ProfileIdIndex"
    );

    if (response.items.length === 0) {
      console.log("Creating security profile...");
      await db.put({
        tableName: TABLE_NAME,
        item: securityProfile,
      });
      console.log("Security profile created successfully");
    } else {
      console.log("Security profile already exists");
    }

    console.log("Setup completed successfully");
  } catch (error) {
    console.error("Error fixing security profile:", error);
  }
}

fixSecurityProfile(); 