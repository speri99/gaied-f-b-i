import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { getVerifiedTenantId } from "@/lib/utils/tenant-verify";
import { debug } from "@/lib/debug";
import { ActionLogService } from "@/lib/services/action-log.service";

interface WebsiteTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  html: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

const TEMPLATES_TABLE = process.env.DYNAMODB_WEBSITE_TEMPLATES_TABLE || 'GEO-WebsiteTemplates';
const dynamoDb = new DynamoDBService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getVerifiedTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const id = params.id;
    const template = await dynamoDb.get<WebsiteTemplate>(TEMPLATES_TABLE, { tenantId, id });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    if (template.deleted) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getVerifiedTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const id = params.id;
    const existingTemplate = await dynamoDb.get<WebsiteTemplate>(TEMPLATES_TABLE, { tenantId, id });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    if (existingTemplate.deleted) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updatedTemplate: Partial<WebsiteTemplate> = {
      ...body,
      tenantId,
      id,
      updatedAt: new Date().toISOString()
    };

    await dynamoDb.update(TEMPLATES_TABLE, { tenantId, id }, updatedTemplate);
    return NextResponse.json({ message: "Template updated successfully" });
  } catch (error) {
    console.error("Failed to update template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getVerifiedTenantId(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const id = params.id;
    const existingTemplate = await dynamoDb.get<WebsiteTemplate>(TEMPLATES_TABLE, { tenantId, id });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    if (existingTemplate.deleted) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting deleted flag
    await dynamoDb.update(TEMPLATES_TABLE, { tenantId, id }, {
      deleted: true,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
} 