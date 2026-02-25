import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { OrganizationService } from "@/lib/services/organization.service";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    if (!token?.email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get organization by contact email
    const organization = await OrganizationService.getOrganizationByContactEmail(
      token.email
    );

    if (!organization) {
      return NextResponse.json(
        { message: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: organization.status,
      message: getStatusMessage(organization.status),
    });
  } catch (error) {
    console.error("Error checking organization status:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case "Pending":
      return "Your organization is under review";
    case "Approved":
      return "Your organization has been approved";
    case "Rejected":
      return "Your organization application has been rejected";
    default:
      return "Unknown status";
  }
} 