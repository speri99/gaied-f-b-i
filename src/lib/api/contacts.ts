import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  type ScanCommandInput,
  type GetCommandInput,
} from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

export interface ContactRecord {
  UUID: string;
  identifier: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  dispatched: boolean;
}

export interface SensitiveLocationData {
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

export interface ContactRecordWithoutLocation {
  UUID: string;
  identifier: string;
  timestamp: string;
  dispatched: boolean;
}

export async function scanContacts(): Promise<ContactRecordWithoutLocation[]> {
  // Debug environment variables
  console.log("Environment check:", {
    tableName: process.env.DYNAMODB_CONTACT_RECORDS_TABLE,
    region: process.env.AWS_REGION,
    hasCredentials:
      !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY,
  });

  const params: ScanCommandInput = {
    TableName: process.env.DYNAMODB_CONTACT_RECORDS_TABLE,
    ProjectionExpression: "#uuid, identifier, #ts, dispatched",
    ExpressionAttributeNames: {
      "#uuid": "UUID",
      "#ts": "timestamp",
    },
  };

  try {
    console.log("Scanning with params:", JSON.stringify(params, null, 2));
    const command = new ScanCommand(params);
    const result = await docClient.send(command);

    // Debug log the raw response
    console.log("DynamoDB scan response:", JSON.stringify(result, null, 2));

    if (!result.Items || result.Items.length === 0) {
      console.warn("No items returned from DynamoDB");
      return [];
    }

    // Log the first item to see its structure
    console.log(
      "Sample item structure:",
      JSON.stringify(result.Items[0], null, 2)
    );

    // Validate and transform the items
    const validItems = (result.Items || []).filter((item) => {
      const isValid =
        item &&
        typeof item.UUID === "string" &&
        typeof item.identifier === "string" &&
        typeof item.timestamp === "string" &&
        typeof item.dispatched === "boolean";

      if (!isValid) {
        console.warn("Invalid item found:", JSON.stringify(item, null, 2));
      }

      return isValid;
    });

    console.log(
      `Found ${validItems.length} valid items out of ${result.Items.length} total items`
    );
    return validItems as ContactRecordWithoutLocation[];
  } catch (error) {
    console.error("Error scanning contacts:", error);
    throw error;
  }
}

export async function getContactLocation(
  uuid: string
): Promise<SensitiveLocationData | null> {
  console.log("Fetching location data for UUID:", uuid);

  const params: GetCommandInput = {
    TableName: process.env.DYNAMODB_CONTACT_RECORDS_TABLE,
    Key: {
      UUID: uuid,
    },
    ProjectionExpression: "formattedAddress, latitude, longitude",
  };

  try {
    console.log("GetItem params:", JSON.stringify(params, null, 2));
    const command = new GetCommand(params);

    // Log AWS credentials status
    console.log("AWS Credentials check:", {
      region: process.env.AWS_REGION,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    });

    const result = await docClient.send(command);
    console.log("DynamoDB GetItem response:", JSON.stringify(result, null, 2));

    if (!result.Item) {
      console.warn("No item found for UUID:", uuid);
      return null;
    }

    // Validate the item structure
    const item = result.Item;
    console.log("Retrieved item structure:", {
      hasFormattedAddress: !!item.formattedAddress,
      hasLatitude: !!item.latitude,
      hasLongitude: !!item.longitude,
      formattedAddressType: typeof item.formattedAddress,
      latitudeType: typeof item.latitude,
      longitudeType: typeof item.longitude,
    });

    if (!item.formattedAddress || !item.latitude || !item.longitude) {
      console.warn("Invalid location data structure:", item);
      return null;
    }

    return {
      formattedAddress: item.formattedAddress,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
    };
  } catch (error) {
    console.error("Error getting contact location:", {
      error,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
      params,
    });
    throw error;
  }
}
