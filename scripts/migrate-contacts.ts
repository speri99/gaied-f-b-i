import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=').map(str => str.trim());
  if (key && value) {
    process.env[key] = value;
  }
});

// Validate required environment variables
const requiredEnvVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

const DEFAULT_TENANT_ID = process.env.DEV_TENANT_ID || 'TENANT-001';

function extractValue(value: any): any {
  if (!value) return value;
  
  if (typeof value === 'object') {
    if ('S' in value) return value.S;
    if ('N' in value) return Number(value.N);
    if ('BOOL' in value) return value.BOOL;
    if ('NULL' in value) return null;
    if ('L' in value) return value.L.map(extractValue);
    if ('M' in value) {
      const result: any = {};
      for (const [k, v] of Object.entries(value.M)) {
        result[k] = extractValue(v);
      }
      return result;
    }
  }
  return value;
}

function formatItem(item: any) {
  const formattedItem: any = {};
  
  for (const [key, value] of Object.entries(item)) {
    formattedItem[key] = extractValue(value);
  }
  
  // Ensure UUID is a string
  if (formattedItem.UUID && typeof formattedItem.UUID === 'object') {
    formattedItem.UUID = formattedItem.UUID.S || formattedItem.UUID.toString();
  }
  
  // Add tenantId
  formattedItem.tenantId = DEFAULT_TENANT_ID;
  
  return formattedItem;
}

async function migrateContacts() {
  try {
    // Read the backup file
    const backupData = JSON.parse(fs.readFileSync('contacts_backup.json', 'utf-8'));
    const items = backupData.Items || [];

    console.log(`Found ${items.length} items to migrate`);

    let successCount = 0;
    let errorCount = 0;

    // Migrate each item
    for (const item of items) {
      try {
        const newItem = formatItem(item);
        
        // Log the first item's structure for debugging
        if (successCount === 0) {
          console.log('Sample item structure:', JSON.stringify(newItem, null, 2));
        }

        await docClient.send(new PutCommand({
          TableName: 'GEO-LocationRecords-New',
          Item: newItem,
        }));
        successCount++;
        if (successCount % 100 === 0) {
          console.log(`Migrated ${successCount} items so far...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error migrating item:`, error);
        console.error('Item that caused error:', JSON.stringify(item, null, 2));
      }
    }

    console.log(`Migration completed. Successfully migrated ${successCount} items. Failed to migrate ${errorCount} items.`);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateContacts(); 