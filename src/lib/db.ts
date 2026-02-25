import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Validate required environment variables
const requiredEnvVars = {
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  DDB_CASERECORDS_TABLE_NAME: process.env.DYNAMODB_CASE_RECORDS_TABLE,
  DDB_CONTACTRECORDS_TABLE_NAME: process.env.DYNAMODB_CONTACTRECORDS_TABLE,
};

// Log which environment variables are missing
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
  }
});

// Create the DynamoDB client with explicit configuration
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  // Add retry configuration
  maxAttempts: 3,
});

// Configure the document client with proper marshalling options
const marshallOptions = {
  // Convert empty strings, blobs, and sets to null
  convertEmptyValues: true,
  // Remove undefined values
  removeUndefinedValues: true,
  // Convert typeof object to map attribute
  convertClassInstanceToMap: true,
};

const unmarshallOptions = {
  // Return numbers as numbers instead of strings
  wrapNumbers: false,
};

// Create and export the document client
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions,
  unmarshallOptions,
});

// Export table names
export const TABLES = {
  CASES: process.env.DYNAMODB_CASE_RECORDS_TABLE,
  CONTACTS: process.env.DYNAMODB_CONTACT_RECORDS_TABLE,
} as const;

// Log table names for debugging
console.log("DynamoDB Configuration:", {
  region: process.env.AWS_REGION,
  casesTable: TABLES.CASES,
  contactsTable: TABLES.CONTACTS,
});
