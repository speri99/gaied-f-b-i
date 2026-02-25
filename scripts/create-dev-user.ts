import { DynamoDBService } from "@/lib/dynamodb";
import { User } from "@/types/user";
import { SecurityProfile } from "@/types/security";

const db = new DynamoDBService();
const USERS_TABLE = "GEO-Users";
const SECURITY_PROFILES_TABLE = "GEO-SecurityProfiles";

async function createDevUser() {
  try {
    // Create a security profile for the dev user
    const profileId = "dev-profile-001";
    const securityProfile: SecurityProfile = {
      profileId,
      tenantId: "TENANT-001",
      name: "Developer Profile",
      description: "Profile for development user with full access",
      permissions: [
        "read:cases",
        "write:cases",
        "delete:cases",
        "read:contacts",
        "write:contacts",
        "delete:contacts",
        "read:locations",
        "write:locations",
        "manage:users",
        "manage:profiles",
        "view:analytics",
        "export:data"
      ],
      status: "Active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        version: 1,
        createdBy: "system",
        lastModifiedBy: "system"
      }
    };

    // Check if profile already exists
    const existingProfile = await db.get<SecurityProfile>(SECURITY_PROFILES_TABLE, {
      tenantId: "TENANT-001",
      profileId
    });

    if (!existingProfile) {
      console.log("Creating security profile...");
      await db.put(SECURITY_PROFILES_TABLE, securityProfile);
      console.log("Security profile created successfully");
    } else {
      console.log("Security profile already exists");
    }

    // Create the dev user with the ID from the environment variable
    const userId = "USER-9755206f-063e-4d43-9b38-c3e3a9733eb1";
    const user: User = {
      userId,
      tenantId: "TENANT-001",
      email: "dev@example.com",
      firstName: "Dev",
      lastName: "User",
      phoneNumber: "",
      role: "Admin",
      status: "Active",
      authMethod: "Password",
      smsEnabled: false,
      securityProfiles: [profileId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      updatedBy: "system"
    };

    // Check if user already exists
    const existingUser = await db.get<User>(USERS_TABLE, {
      tenantId: "TENANT-001",
      userId
    });

    if (!existingUser) {
      console.log("Creating dev user...");
      await db.put(USERS_TABLE, user);
      console.log("Dev user created successfully");
    } else {
      console.log("Dev user already exists");
    }

    console.log("Setup completed successfully");
  } catch (error) {
    console.error("Error creating dev user:", error);
  }
}

createDevUser(); 