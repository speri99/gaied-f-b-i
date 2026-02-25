import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

// Initialize DynamoDB client with region from environment variables
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!region || !accessKeyId || !secretAccessKey) {
  console.error("Missing AWS credentials in environment variables");
  throw new Error("Missing AWS credentials in environment variables");
}

const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  maxAttempts: 3,
});

const docClient = DynamoDBDocumentClient.from(client);

export interface ActionLog {
  tenantId: string;
  timestamp: string;
  actionId: string;
  entityId: string;
  entityType: 'case' | 'phone_number' | 'user' | 'template';
  action: 'create' | 'update' | 'delete' | 'add' | 'remove';
  userId: string;
  details: Record<string, any>;
  metadata?: Record<string, any>;
}

export class ActionLogService {
  private static TABLE_NAME = process.env.DYNAMODB_ACTION_LOGS_TABLE;

  static async logAction({
    tenantId,
    entityId,
    entityType,
    action,
    userId,
    details,
    metadata = {}
  }: Omit<ActionLog, 'actionId' | 'timestamp'>) {
    if (!this.TABLE_NAME) {
      throw new Error("DYNAMODB_ACTION_LOGS_TABLE is not defined in environment variables");
    }

    if (!tenantId || !userId) {
      throw new Error("tenantId and userId are required for action logging");
    }

    const timestamp = new Date().toISOString();
    const actionId = uuidv4();

    const item: ActionLog = {
      tenantId,
      timestamp,
      actionId,
      entityId,
      entityType,
      action,
      userId,
      details,
      metadata
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: this.TABLE_NAME,
          Item: item
        })
      );

      return item;
    } catch (error) {
      console.error('Error logging action:', error);
      // Don't throw the error as logging should not break the main flow
      return null;
    }
  }
} 