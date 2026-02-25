const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const TABLE_NAME = process.env.DYNAMODB_CASE_RECORDS_TABLE;
const OLD_USER_ID = "USER-9755206f-063e-4d43-9b38-c3e3a9733eb1";
const NEW_USER_ID = "USER-12345";
const TENANT_ID = process.env.DEV_TENANT_ID || "TENANT-001";

async function updateCaseManager() {
  try {
    console.log(`Updating case manager from ${OLD_USER_ID} to ${NEW_USER_ID} in table ${TABLE_NAME}`);
    
    // First, get all cases for the tenant
    const getCasesCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        tenantId: TENANT_ID,
        Identifier: "CASE-001" // Replace with the actual case ID you want to update
      }
    });
    
    const caseData = await docClient.send(getCasesCommand);
    
    if (!caseData.Item) {
      console.log("Case not found");
      return;
    }
    
    console.log("Found case:", caseData.Item);
    
    // Update the case manager
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        tenantId: TENANT_ID,
        Identifier: "CASE-001" // Replace with the actual case ID you want to update
      },
      UpdateExpression: "SET CaseManager = :newUserId",
      ExpressionAttributeValues: {
        ":newUserId": NEW_USER_ID
      },
      ReturnValues: "ALL_NEW"
    });
    
    const result = await docClient.send(updateCommand);
    console.log("Updated case:", result.Attributes);
    
    console.log("Successfully updated case manager");
  } catch (error) {
    console.error("Error updating case manager:", error);
  }
}

updateCaseManager(); 