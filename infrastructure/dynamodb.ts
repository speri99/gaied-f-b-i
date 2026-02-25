import * as aws from "@pulumi/aws";

export const ShortenedUrlsTable = new aws.dynamodb.Table("shortened-urls", {
  attributes: [
    { name: "code", type: "S" },
    { name: "tenantId", type: "S" },
    { name: "caseId", type: "S" },
  ],
  hashKey: "code",
  globalSecondaryIndexes: [
    {
      name: "byTenantId",
      hashKey: "tenantId",
      projectionType: "ALL",
    },
    {
      name: "byCaseId",
      hashKey: "caseId",
      projectionType: "ALL",
    },
  ],
  billingMode: "PAY_PER_REQUEST",
  streamEnabled: true,
  tags: {
    Environment: "production",
  },
});

export const TenantsTable = new aws.dynamodb.Table("tenants", {
  attributes: [
    { name: "tenantId", type: "S" },
    { name: "name", type: "S" },
  ],
  hashKey: "tenantId",
  globalSecondaryIndexes: [
    {
      name: "byName",
      hashKey: "name",
      projectionType: "ALL",
    },
  ],
  billingMode: "PAY_PER_REQUEST",
  streamEnabled: true,
  tags: {
    Environment: "production",
  },
});

export const CasePhoneIndexTable = new aws.dynamodb.Table("GEO-CasePhoneIndexTable", {
  attributes: [
    { name: "tenantId", type: "S" },
    { name: "phoneNumber", type: "S" },
    { name: "caseId", type: "S" },
  ],
  hashKey: "tenantId",
  rangeKey: "phoneNumber",
  globalSecondaryIndexes: [
    {
      name: "byCaseId",
      hashKey: "caseId",
      projectionType: "ALL",
    },
  ],
  billingMode: "PAY_PER_REQUEST",
  streamEnabled: true,
  tags: {
    Environment: "production",
  },
});

export const AccessLogsTable = new aws.dynamodb.Table("GEO-AccessLogs", {
  attributes: [
    { name: "id", type: "S" },
    { name: "resourceId", type: "S" },
    { name: "timestamp", type: "N" },
  ],
  hashKey: "id",
  globalSecondaryIndexes: [
    {
      name: "ResourceIdIndex",
      hashKey: "resourceId",
      rangeKey: "timestamp",
      projectionType: "ALL",
    },
  ],
  billingMode: "PAY_PER_REQUEST",
  streamEnabled: true,
  tags: {
    Environment: "production",
  },
}); 