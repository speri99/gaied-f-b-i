import { CreateTableCommand, DynamoDBClient, DeleteTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import * as dotenv from "dotenv";
import {
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
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

// Validate required environment variables
const requiredEnvVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'DYNAMODB_USERS_TABLE',
  'DYNAMODB_SECURITY_PROFILES_TABLE',
  'DYNAMODB_CASE_RECORDS_TABLE',
  'DYNAMODB_CONTACT_RECORDS_TABLE',
  'DYNAMODB_SENSITIVE_LOCATIONS_TABLE',
  'DYNAMODB_WEBSITE_TEMPLATES_TABLE',
  'DYNAMODB_SHORTENED_URLS_TABLE',
  'DYNAMODB_CASE_PHONE_INDEX_TABLE',
  'DYNAMODB_TENANTS_TABLE',
  'DYNAMODB_ACCESS_LOGS_TABLE',
];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Dev throughput settings
const DEV_THROUGHPUT = {
  ReadCapacityUnits: 1,
  WriteCapacityUnits: 1,
};

// Ensure region is set
const region = process.env.AWS_REGION || 'us-west-2';
console.log(`Using AWS region: ${region}`);

// Create DynamoDB client with explicit region
const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

async function deleteTable(tableName: string) {
  try {
    // First check if the table exists
    const describeCommand = new DescribeTableCommand({ TableName: tableName });
    const tableInfo = await docClient.send(describeCommand);
    
    // If we get here, the table exists
    console.log(`Table ${tableName} exists, skipping deletion`);
    return;
  } catch (error) {
    if ((error as any).name === "ResourceNotFoundException") {
      console.log(`Table ${tableName} does not exist, no need to delete`);
    } else {
      console.error(`Error checking table ${tableName}:`, error);
    }
  }
}

async function deleteAllTables() {
  console.log("Starting table check...");
  
  // Just check tables, don't delete them
  await deleteTable(process.env.DYNAMODB_USERS_TABLE!);
  await deleteTable(process.env.DYNAMODB_SECURITY_PROFILES_TABLE!);
  await deleteTable(process.env.DYNAMODB_CASE_RECORDS_TABLE!);
  await deleteTable(process.env.DYNAMODB_CONTACT_RECORDS_TABLE!);
  await deleteTable(process.env.DYNAMODB_SENSITIVE_LOCATIONS_TABLE!);
  await deleteTable(process.env.DYNAMODB_WEBSITE_TEMPLATES_TABLE!);
  await deleteTable(process.env.DYNAMODB_SHORTENED_URLS_TABLE!);
  
  console.log("Table check completed!");
}

async function createTable(command: CreateTableCommand) {
  try {
    const response = await docClient.send(command);
    console.log(`Table ${command.input.TableName} created:`, response);
  } catch (error) {
    if ((error as any).name === "ResourceInUseException") {
      console.log(`Table ${command.input.TableName} already exists, skipping creation`);
    } else {
      throw error;
    }
  }
}

async function createUsersTable() {
  const command = new CreateTableCommand({
    TableName: process.env.DYNAMODB_USERS_TABLE,
    AttributeDefinitions: [
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "tenantId", KeyType: "HASH" },
      { AttributeName: "userId", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserIdIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "tenantId", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
      {
        IndexName: "EmailIndex",
        KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
    ],
    ProvisionedThroughput: DEV_THROUGHPUT,
  });

  await createTable(command);
}

async function createSecurityProfilesTable() {
  const command = new CreateTableCommand({
    TableName: process.env.DYNAMODB_SECURITY_PROFILES_TABLE,
    AttributeDefinitions: [
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "profileId", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "tenantId", KeyType: "HASH" },
      { AttributeName: "profileId", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "ProfileIdIndex",
        KeySchema: [{ AttributeName: "profileId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
    ],
    ProvisionedThroughput: DEV_THROUGHPUT,
  });

  await createTable(command);
}

async function createCaseRecordsTable() {
  const command = new CreateTableCommand({
    TableName: process.env.DYNAMODB_CASE_RECORDS_TABLE!,
    AttributeDefinitions: [
      { AttributeName: "Identifier", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "N" },
    ],
    KeySchema: [{ AttributeName: "Identifier", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "CreatedAtIndex",
        KeySchema: [{ AttributeName: "createdAt", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
    ],
    ProvisionedThroughput: DEV_THROUGHPUT,
  });

  await createTable(command);
}

async function createContactRecordsTable() {
  const command = new CreateTableCommand({
    TableName: process.env.DYNAMODB_CONTACT_RECORDS_TABLE!,
    AttributeDefinitions: [
      { AttributeName: "UUID", AttributeType: "S" },
      { AttributeName: "caseId", AttributeType: "S" },
      { AttributeName: "timestamp", AttributeType: "N" },
    ],
    KeySchema: [{ AttributeName: "UUID", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "CaseIdIndex",
        KeySchema: [
          { AttributeName: "caseId", KeyType: "HASH" },
          { AttributeName: "timestamp", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
      {
        IndexName: "TimestampIndex",
        KeySchema: [{ AttributeName: "timestamp", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
    ],
    ProvisionedThroughput: DEV_THROUGHPUT,
  });

  await createTable(command);
}

async function createSensitiveLocationsTable() {
  const command = new CreateTableCommand({
    TableName: process.env.DYNAMODB_SENSITIVE_LOCATIONS_TABLE!,
    AttributeDefinitions: [
      { AttributeName: "locationId", AttributeType: "S" },
      { AttributeName: "caseId", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "N" },
    ],
    KeySchema: [{ AttributeName: "locationId", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "CaseIdIndex",
        KeySchema: [{ AttributeName: "caseId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
      {
        IndexName: "CreatedAtIndex",
        KeySchema: [{ AttributeName: "createdAt", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
    ],
    ProvisionedThroughput: DEV_THROUGHPUT,
  });

  await createTable(command);
}

async function createWebsiteTemplatesTable() {
  const command = new CreateTableCommand({
    TableName: process.env.DYNAMODB_WEBSITE_TEMPLATES_TABLE,
    AttributeDefinitions: [
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "id", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "tenantId", KeyType: "HASH" },
      { AttributeName: "id", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "IdIndex",
        KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
    ],
    ProvisionedThroughput: DEV_THROUGHPUT,
  });

  await createTable(command);
}

async function createShortenedUrlsTable() {
  const command = new CreateTableCommand({
    TableName: process.env.DYNAMODB_SHORTENED_URLS_TABLE!,
    AttributeDefinitions: [
      { AttributeName: "code", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "caseId", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "code", KeyType: "HASH" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "byTenantId",
        KeySchema: [{ AttributeName: "tenantId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
      {
        IndexName: "byCaseId",
        KeySchema: [{ AttributeName: "caseId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
    ],
    ProvisionedThroughput: DEV_THROUGHPUT,
  });

  await createTable(command);
}

async function createCasePhoneIndexTable() {
  const command = new CreateTableCommand({
    TableName: process.env.DYNAMODB_CASE_PHONE_INDEX_TABLE!,
    AttributeDefinitions: [
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "phoneNumber", AttributeType: "S" },
      { AttributeName: "caseId", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "tenantId", KeyType: "HASH" },
      { AttributeName: "phoneNumber", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "byCaseId",
        KeySchema: [{ AttributeName: "caseId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
    ],
    ProvisionedThroughput: DEV_THROUGHPUT,
  });

  await createTable(command);
}

async function createTenantsTable() {
  const command = new CreateTableCommand({
    TableName: process.env.DYNAMODB_TENANTS_TABLE!,
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "name", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "byName",
        KeySchema: [{ AttributeName: "name", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
    ],
    ProvisionedThroughput: DEV_THROUGHPUT,
  });

  await createTable(command);
}

async function createAccessLogsTable() {
  const command = new CreateTableCommand({
    TableName: process.env.DYNAMODB_ACCESS_LOGS_TABLE!,
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "resourceId", AttributeType: "S" },
      { AttributeName: "timestamp", AttributeType: "N" },
    ],
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "ResourceIdIndex",
        KeySchema: [
          { AttributeName: "resourceId", KeyType: "HASH" },
          { AttributeName: "timestamp", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: DEV_THROUGHPUT,
      },
    ],
    ProvisionedThroughput: DEV_THROUGHPUT,
  });

  await createTable(command);
}

async function createAllTables() {
  console.log("Creating all tables...");
  
  await createUsersTable();
  await createSecurityProfilesTable();
  await createCaseRecordsTable();
  await createContactRecordsTable();
  await createSensitiveLocationsTable();
  await createWebsiteTemplatesTable();
  await createShortenedUrlsTable();
  await createCasePhoneIndexTable();
  await createTenantsTable();
  await createAccessLogsTable();
  
  console.log("All tables created successfully!");
}

// Run the creation script
createAllTables().catch(console.error); 