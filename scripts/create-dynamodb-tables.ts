import { DynamoDBClient, CreateTableCommand, DescribeTableCommand, ScalarAttributeType, KeyType, ProjectionType } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function createTableIfNotExists(
  tableName: string,
  attributes: { [key: string]: ScalarAttributeType },
  keySchema: { AttributeName: string; KeyType: KeyType }[],
  globalSecondaryIndexes?: {
    IndexName: string;
    KeySchema: { AttributeName: string; KeyType: KeyType }[];
    Projection: { ProjectionType: ProjectionType };
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
    [{ AttributeName: "id", KeyType: "HASH" }]
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