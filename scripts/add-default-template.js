const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Get AWS credentials from environment variables
const region = process.env.AWS_REGION || "us-west-2";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

console.log("AWS Configuration:", {
  region: region ? "configured" : "missing",
  hasAccessKey: !!accessKeyId,
  hasSecretKey: !!secretAccessKey
});

if (!region || !accessKeyId || !secretAccessKey) {
  console.error("Missing AWS credentials in environment variables");
  process.exit(1);
}

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

const TEMPLATES_TABLE = process.env.DYNAMODB_WEBSITE_TEMPLATES_TABLE || 'GEO-WebsiteTemplates';
const TENANT_ID = process.env.DEV_TENANT_ID || "TENANT-001";

async function addDefaultTemplate() {
  try {
    console.log(`Adding default template to table ${TEMPLATES_TABLE}`);
    
    const now = new Date().toISOString();
    const templateId = "TEMPLATE-001";
    
    const template = {
      id: templateId,
      tenantId: TENANT_ID,
      name: "Default Template",
      description: "A default website template for cases",
      html: "<html><body><h1>Default Template</h1><p>This is a default template.</p></body></html>",
      type: "default",
      createdAt: now,
      updatedAt: now,
      deleted: false
    };
    
    const command = new PutCommand({
      TableName: TEMPLATES_TABLE,
      Item: template
    });
    
    await docClient.send(command);
    console.log("Successfully added default template:", template);
  } catch (error) {
    console.error("Error adding default template:", error);
  }
}

addDefaultTemplate(); 