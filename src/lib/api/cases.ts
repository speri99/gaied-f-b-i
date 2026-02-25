import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Case, DynamoDBCase } from "@/types/case";

// Initialize DynamoDB client
const getDynamoDBClient = () => {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS credentials");
  }

  const client = new DynamoDBClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return DynamoDBDocumentClient.from(client);
};

// Convert DynamoDB record to Case interface
export function convertDynamoDBToCase(item: Record<string, any>): Case {
  console.log("Converting DynamoDB item:", JSON.stringify(item, null, 2));

  return {
    Identifier: item.Identifier,
    BackupCaseManager: item.BackupCaseManager,
    BackupCaseManagerEmail: item.BackupCaseManagerEmail,
    BackupCaseManagerPhone: item.BackupCaseManagerPhone,
    CaseManager: item.CaseManager,
    CaseManagerEmail: item.CaseManagerEmail,
    CaseManagerPhone: item.CaseManagerPhone,
    ReportedAbuser: item.ReportedAbuser,
    VictimName: item.VictimName,
    status: item.status,
    type: item.type,
    lastUpdated: item.lastUpdated,
    tags: item.tags || [],
    Notes: item.Notes,
    Priority: item.Priority,
    FollowUpDate: item.FollowUpDate,
    CaseworkerNotes: item.CaseworkerNotes,
    SmsNotifications: item.SmsNotifications,
    BackupSmsNotifications: item.BackupSmsNotifications,
  };
}

export async function scanCases() {
  const client = getDynamoDBClient();
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error("Missing DYNAMODB_TABLE_NAME environment variable");
  }

  console.log("Scanning DynamoDB table:", tableName);

  try {
    const command = new ScanCommand({
      TableName: tableName,
    });

    const response = await client.send(command);
    console.log("DynamoDB scan response:", {
      count: response.Count,
      scannedCount: response.ScannedCount,
      items: response.Items ? response.Items.length : 0,
    });

    if (!response.Items) {
      return [];
    }

    return response.Items.map((item) => {
      try {
        return convertDynamoDBToCase(item);
      } catch (error) {
        console.error("Error converting item:", error, item);
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    console.error("Error scanning DynamoDB:", error);
    throw error;
  }
}

// Convert Case to DynamoDB format
export function convertCaseToDynamoDB(item: Case): DynamoDBCase {
  return {
    Identifier: { S: item.Identifier },
    BackupCaseManager: { S: item.BackupCaseManager },
    BackupCaseManagerEmail: { S: item.BackupCaseManagerEmail },
    BackupCaseManagerPhone: { S: item.BackupCaseManagerPhone },
    CaseManager: { S: item.CaseManager },
    CaseManagerEmail: { S: item.CaseManagerEmail },
    CaseManagerPhone: { S: item.CaseManagerPhone },
    ReportedAbuser: { S: item.ReportedAbuser },
    VictimName: { S: item.VictimName },
    status: item.status ? { S: item.status } : undefined,
    type: item.type ? { S: item.type } : undefined,
    lastUpdated: item.lastUpdated ? { S: item.lastUpdated } : undefined,
    tags: item.tags ? { L: item.tags.map((tag) => ({ S: tag })) } : undefined,
  };
}
