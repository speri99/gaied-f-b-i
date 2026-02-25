const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
require('dotenv').config({ path: '.env.local' });

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

async function addDevUser() {
  try {
    const userId = "USER-9755206f-063e-4d43-9b38-c3e3a9733eb1";
    const tenantId = "TENANT-001";
    
    const user = {
      userId,
      tenantId,
      email: "dev@example.com",
      firstName: "Dev",
      lastName: "User",
      phoneNumber: "",
      role: "Admin",
      status: "Active",
      authMethod: "Password",
      smsEnabled: false,
      securityProfiles: ["dev-profile-001"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      updatedBy: "system"
    };

    console.log("Adding dev user to DynamoDB...");
    console.log("User ID:", userId);
    console.log("Tenant ID:", tenantId);
    
    const command = new PutCommand({
      TableName: process.env.DYNAMODB_USERS_TABLE || "GEO-Users",
      Item: user,
    });

    await docClient.send(command);
    console.log("Dev user added successfully!");
  } catch (error) {
    console.error("Error adding dev user:", error);
  }
}

addDevUser(); 