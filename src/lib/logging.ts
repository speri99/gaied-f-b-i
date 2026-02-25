import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

const LOG_TABLE = process.env.DYNAMODB_ACTION_LOG_TABLE || "GEO-ActionLog";

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const dbClient = new DynamoDBClient({
  region,
  credentials: { accessKeyId, secretAccessKey },
  maxAttempts: 3,
});
const docClient = DynamoDBDocumentClient.from(dbClient);

export async function logAction({
  tenantId,
  userId,
  action,
  actionId = uuidv4(),
  details = {},
  entityId = null,
  entityType = null,
  metadata = {},
}: {
  tenantId: string;
  userId: string;
  action: string;
  actionId?: string;
  details?: Record<string, any>;
  entityId?: string | null;
  entityType?: string | null;
  metadata?: Record<string, any>;
}) {
  const timestamp = new Date().toISOString();
  const logItem: Record<string, any> = {
    tenantId,
    timestamp,
    action,
    actionId,
    details,
    entityId,
    entityType,
    metadata,
    userId,
  };
  // Remove null fields
  Object.keys(logItem).forEach(
    (key) => logItem[key] === null && delete logItem[key]
  );
  await docClient.send(
    new PutCommand({
      TableName: LOG_TABLE,
      Item: logItem,
    })
  );
  return logItem;
} 