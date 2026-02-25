import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { v4 as uuidv4 } from "uuid";
import { getServerAuthContext } from "@/lib/server-auth";

const dynamoDB = new DynamoDBService();
const TABLE_NAME = "GEO-Notes";

export async function GET(request: NextRequest) {
  try {
    const authContext = await getServerAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { tenantId } = authContext;
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get("entityId");
    const entityType = searchParams.get("entityType");

    let filterExpression = "tenantId = :tenantId";
    const expressionValues: Record<string, any> = {
      ":tenantId": tenantId
    };

    if (entityId) {
      filterExpression += " AND entityId = :entityId";
      expressionValues[":entityId"] = entityId;
    }

    if (entityType) {
      filterExpression += " AND entityType = :entityType";
      expressionValues[":entityType"] = entityType;
    }

    const result = await dynamoDB.scan(
      TABLE_NAME,
      filterExpression,
      expressionValues
    );

    return NextResponse.json(result.items || []);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getServerAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { tenantId } = authContext;
    const body = await request.json();
    const { content, entityId, entityType } = body;

    if (!content || !entityId || !entityType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const note = {
      id: uuidv4(),
      tenantId,
      entityId,
      entityType,
      content,
      createdBy: "Current User", // TODO: Get from auth context
      timestamp: new Date().toISOString(),
    };

    await dynamoDB.put({
      tableName: TABLE_NAME,
      item: note,
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authContext = await getServerAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { tenantId } = authContext;
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      );
    }

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updateData).forEach(([key, value]) => {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    });

    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    const result = await dynamoDB.update(
      TABLE_NAME,
      { id, tenantId },
      updateData
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authContext = await getServerAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { tenantId } = authContext;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      );
    }

    await dynamoDB.delete(TABLE_NAME, { id, tenantId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
} 