import { CreateTableCommand, DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env.local file not found at ${envPath}`);
}

// Debug logging
console.log('Environment variables loaded:');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '***' : 'not set');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '***' : 'not set');

// Set default region if not provided
const region = process.env.AWS_REGION || 'us-east-1';
console.log(`Using AWS region: ${region}`);

// Dev throughput settings
const DEV_THROUGHPUT = {
  ReadCapacityUnits: 1,
  WriteCapacityUnits: 1,
};

// Create DynamoDB client with explicit region
const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

async function createTableIfNotExists(
  tableName: string,
  attributes: { [key: string]: string },
  keySchema: { AttributeName: string; KeyType: string }[],
  globalSecondaryIndexes?: {
    IndexName: string;
    KeySchema: { AttributeName: string; KeyType: string }[];
    Projection: { ProjectionType: string };
  }[]
) {
  try {
    // Check if table exists
    await docClient.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`Table ${tableName} already exists`);
  } catch (error) {
    // Table doesn't exist, create it
    console.log(`Creating table ${tableName}...`);
    await docClient.send(
      new CreateTableCommand({
        TableName: tableName,
        AttributeDefinitions: Object.entries(attributes).map(([name, type]) => ({
          AttributeName: name,
          AttributeType: type,
        })),
        KeySchema: keySchema,
        GlobalSecondaryIndexes: globalSecondaryIndexes,
        BillingMode: "PAY_PER_REQUEST",
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: "NEW_AND_OLD_IMAGES",
        },
        Tags: [
          {
            Key: "Environment",
            Value: "Development",
          },
        ],
      })
    );
    console.log(`Table ${tableName} created successfully`);
  }
}

async function main() {
  // Create CasePhoneIndexTable
  await createTableIfNotExists(
    "GEO-CasePhoneIndexTable",
    {
      tenantId: "S",
      phoneNumber: "S",
      caseId: "S",
    },
    [
      { AttributeName: "tenantId", KeyType: "HASH" },
      { AttributeName: "phoneNumber", KeyType: "RANGE" },
    ],
    [
      {
        IndexName: "byCaseId",
        KeySchema: [{ AttributeName: "caseId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ]
  );

  // Create TenantsTable
  await createTableIfNotExists(
    "tenants",
    {
      id: "S",
      name: "S",
    },
    [{ AttributeName: "id", KeyType: "HASH" }],
    [
      {
        IndexName: "byName",
        KeySchema: [{ AttributeName: "name", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ]
  );

  // Create ShortenedUrlsTable
  await createTableIfNotExists(
    "shortened-urls",
    {
      code: "S",
      tenantId: "S",
    },
    [{ AttributeName: "code", KeyType: "HASH" }],
    [
      {
        IndexName: "byTenantId",
        KeySchema: [{ AttributeName: "tenantId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ]
  );
}

main().catch((error) => {
  console.error("Error creating tables:", error);
  process.exit(1);
}); 