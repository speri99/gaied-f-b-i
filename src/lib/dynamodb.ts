import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand,
  QueryCommandInput,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  TransactWriteCommand
} from "@aws-sdk/lib-dynamodb";
import { SortConfig } from "@/types/contact";
import { Case } from "@/types/case";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  lastEvaluatedKey?: Record<string, any>;
}

export class DynamoDBService {
  private client: DynamoDBDocumentClient;

  constructor() {
    // Get AWS credentials from environment variables
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    // Add detailed logging for debugging
    console.log('=== AWS Credentials Debug ===');
    console.log('Access Key ID:', accessKeyId?.substring(0, 5) + '...');
    console.log('Has Secret Key:', !!secretAccessKey);
    console.log('Region:', region);
    console.log('=== End AWS Credentials Debug ===');

    if (!region || !accessKeyId || !secretAccessKey) {
      console.error("Missing AWS credentials in environment variables");
      throw new Error("Missing AWS credentials in environment variables");
    }

    try {
      // Create DynamoDB client with AWS SDK v3
      const dbClient = new DynamoDBClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        maxAttempts: 3,
      });

      // Create document client with proper marshalling options
      this.client = DynamoDBDocumentClient.from(dbClient, {
        marshallOptions: {
          removeUndefinedValues: true,
          convertEmptyValues: true,
          convertClassInstanceToMap: true,
        },
        unmarshallOptions: {
          wrapNumbers: false,
        },
      });
    } catch (error) {
      console.error("Failed to initialize DynamoDB client:", error);
      throw new Error("Failed to initialize database connection");
    }
  }

  async get<T>(tableName: string, key: Record<string, any>): Promise<T | null> {
    try {
      const command = new GetCommand({
        TableName: tableName,
        Key: key,
      });

      const response = await this.client.send(command);
      return (response.Item as T) || null;
    } catch (error) {
      console.error(`Error getting item from ${tableName}:`, error);
      throw error;
    }
  }

  async put<T>({ tableName, item }: { tableName: string; item: T }): Promise<T> {
    try {
      const command = new PutCommand({
        TableName: tableName,
        Item: item,
      });

      await this.client.send(command);
      return item;
    } catch (error) {
      console.error(`Error putting item to ${tableName}:`, error);
      throw error;
    }
  }

  async update<T>(
    tableName: string,
    key: Record<string, any>,
    updates: Partial<T>
  ): Promise<T> {
    try {
      const updateExpression = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(updates).forEach(([key, value]) => {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        updateExpression.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      });

      console.log("DynamoDB Update Command:", {
        tableName,
        key,
        updateExpression: `SET ${updateExpression.join(", ")}`,
        expressionAttributeNames,
        expressionAttributeValues,
      });

      const command = new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: `SET ${updateExpression.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      });

      const response = await this.client.send(command);
      return response.Attributes as T;
    } catch (error) {
      console.error(`Error updating item in ${tableName}:`, error);
      throw error;
    }
  }

  async delete(tableName: string, key: Record<string, any>): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: tableName,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      console.error(`Error deleting item from ${tableName}:`, error);
      throw error;
    }
  }

  async query<T>(
    tableName: string,
    params: Omit<QueryCommandInput, "TableName">
  ): Promise<PaginatedResponse<T>> {
    try {
      const { SortConfig, ...queryParams } = params as any;
      
      const command = new QueryCommand({
        TableName: tableName,
        ...queryParams,
        ...(SortConfig && { ScanIndexForward: SortConfig.order === "asc" }),
      });

      console.log("DynamoDB Query Command:", {
        TableName: tableName,
        ...queryParams,
        ...(SortConfig && { ScanIndexForward: SortConfig.order === "asc" }),
      });

      const response = await this.client.send(command);

      return {
        items: (response.Items || []) as T[],
        total: response.Count || 0,
        lastEvaluatedKey: response.LastEvaluatedKey,
      };
    } catch (error) {
      console.error(`Error querying ${tableName}:`, error);
      throw error;
    }
  }

  async scan<T>(
    tableName: string,
    filterExpression?: string,
    expressionAttributeValues?: Record<string, any>,
    limit?: number,
    exclusiveStartKey?: Record<string, any>,
    expressionAttributeNames?: Record<string, string>
  ): Promise<PaginatedResponse<T>> {
    if (!tableName) {
      throw new Error("Table name is required");
    }

    try {
      console.log(`Scanning table ${tableName} with filter:`, {
        filterExpression,
        expressionAttributeValues,
        expressionAttributeNames,
        limit,
        exclusiveStartKey
      });

      const command: any = {
        TableName: tableName,
      };

      if (filterExpression) {
        command.FilterExpression = filterExpression;
        
        if (expressionAttributeNames && Object.keys(expressionAttributeNames).length > 0) {
          const usedNames = Object.keys(expressionAttributeNames).filter(name => 
            filterExpression.includes(name)
          );
          if (usedNames.length > 0) {
            command.ExpressionAttributeNames = Object.fromEntries(
              usedNames.map(name => [name, expressionAttributeNames[name]])
            );
          }
        }
        
        if (expressionAttributeValues && Object.keys(expressionAttributeValues).length > 0) {
          command.ExpressionAttributeValues = expressionAttributeValues;
        }
      }

      if (limit) {
        command.Limit = limit;
      }

      if (exclusiveStartKey) {
        command.ExclusiveStartKey = exclusiveStartKey;
      }

      console.log("DynamoDB Scan Command:", command);

      const response = await this.client.send(new ScanCommand(command));
      console.log(`Scan response for ${tableName}:`, {
        itemCount: response.Count,
        scannedCount: response.ScannedCount,
        hasLastKey: !!response.LastEvaluatedKey
      });

      return {
        items: (response.Items || []) as T[],
        total: response.Count || 0,
        lastEvaluatedKey: response.LastEvaluatedKey,
      };
    } catch (error) {
      console.error(`Error scanning ${tableName}:`, {
        error,
        filterExpression,
        expressionAttributeValues,
        expressionAttributeNames,
        tableName
      });
      throw error;
    }
  }

  async transactWrite(params: { TransactItems: any[] }): Promise<void> {
    try {
      console.log("Executing transaction with items:", params.TransactItems.length);
      
      const command = new TransactWriteCommand(params);
      await this.client.send(command);
      
      console.log("Transaction completed successfully");
    } catch (error) {
      console.error("Error executing transaction:", error);
      throw error;
    }
  }

  async getCase(caseId: string): Promise<Case | null> {
    try {
      const command = new GetCommand({
        TableName: process.env.DYNAMODB_CASE_RECORDS_TABLE!,
        Key: {
          Identifier: caseId,
        },
      });

      const response = await this.client.send(command);
      return response.Item as Case || null;
    } catch (error) {
      console.error("Error getting case:", error);
      throw error;
    }
  }

  async updateCase(caseId: string, updates: Partial<Case>): Promise<Case> {
    try {
      const updateExpression = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(updates).forEach(([key, value]) => {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        updateExpression.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      });

      const command = new UpdateCommand({
        TableName: process.env.DYNAMODB_CASE_RECORDS_TABLE!,
        Key: {
          Identifier: caseId,
        },
        UpdateExpression: `SET ${updateExpression.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      });

      const response = await this.client.send(command);
      return response.Attributes as Case;
    } catch (error) {
      console.error("Error updating case:", error);
      throw error;
    }
  }
} 