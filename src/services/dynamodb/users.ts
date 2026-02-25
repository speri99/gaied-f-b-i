import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { User, CreateUserInput, UpdateUserInput, UserFilter } from "@/types/user";

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
const TableName = process.env.DYNAMODB_USERS_TABLE!;

export async function getUser(tenantId: string, userId: string): Promise<User | null> {
  const command = new GetCommand({
    TableName,
    Key: {
      tenantId,
      userId,
    },
  });

  const response = await docClient.send(command);
  return response.Item as User | null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const command = new QueryCommand({
    TableName,
    IndexName: "EmailIndex",
    KeyConditionExpression: "email = :email",
    ExpressionAttributeValues: {
      ":email": email,
    },
    Limit: 1,
  });

  const response = await docClient.send(command);
  return response.Items?.[0] as User | null;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const now = new Date().toISOString();
  const user: User = {
    ...input,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
    updatedBy: input.createdBy,
  };

  const command = new PutCommand({
    TableName,
    Item: user,
    ConditionExpression: "attribute_not_exists(userId)",
  });

  await docClient.send(command);
  return user;
}

export async function updateUser(
  tenantId: string,
  userId: string,
  input: UpdateUserInput,
  updatedBy: string
): Promise<User> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {
    ":updatedAt": new Date().toISOString(),
    ":updatedBy": updatedBy,
  };

  // Build update expression dynamically
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && !["tenantId", "userId"].includes(key)) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  // Always update updatedAt and updatedBy
  updateExpressions.push("#updatedAt = :updatedAt");
  updateExpressions.push("#updatedBy = :updatedBy");
  expressionAttributeNames["#updatedAt"] = "updatedAt";
  expressionAttributeNames["#updatedBy"] = "updatedBy";

  const command = new UpdateCommand({
    TableName,
    Key: {
      tenantId,
      userId,
    },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  });

  const response = await docClient.send(command);
  return response.Attributes as User;
}

export async function deleteUser(tenantId: string, userId: string): Promise<void> {
  const command = new DeleteCommand({
    TableName,
    Key: {
      tenantId,
      userId,
    },
  });

  await docClient.send(command);
}

export async function listUsers(
  tenantId: string,
  filter?: UserFilter
): Promise<User[]> {
  const keyConditions: string[] = ["tenantId = :tenantId"];
  const filterExpressions: string[] = [];
  const expressionAttributeValues: Record<string, any> = {
    ":tenantId": tenantId,
  };

  // Add search filter if provided
  if (filter?.search) {
    const searchTerm = filter.search.toLowerCase();
    filterExpressions.push(
      "(contains(lower(firstName), :search) OR contains(lower(lastName), :search) OR contains(lower(email), :search))"
    );
    expressionAttributeValues[":search"] = searchTerm;
  }

  // Add role filter if provided
  if (filter?.role && filter.role !== "all") {
    filterExpressions.push("role = :role");
    expressionAttributeValues[":role"] = filter.role;
  }

  // Add status filter if provided
  if (filter?.status && filter.status !== "all") {
    filterExpressions.push("status = :status");
    expressionAttributeValues[":status"] = filter.status;
  }

  const command = new QueryCommand({
    TableName,
    KeyConditionExpression: keyConditions.join(" AND "),
    FilterExpression: filterExpressions.length > 0 ? filterExpressions.join(" AND ") : undefined,
    ExpressionAttributeValues: expressionAttributeValues,
  });

  const response = await docClient.send(command);
  return (response.Items || []) as User[];
} 