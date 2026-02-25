import { NextRequest, NextResponse } from "next/server";
import { OrganizationService } from "@/lib/services/organization.service";
import { organizationSchema } from "@/lib/validations/organization";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Create a safe copy of the body for logging
    const safeBody = { ...body };
    if (safeBody.password) safeBody.password = "[REDACTED]";
    if (safeBody.confirmPassword) safeBody.confirmPassword = "[REDACTED]";
    
    console.log("Received organization creation request:", safeBody);
    
    // Validate request body
    const validatedData = organizationSchema.parse(body);
    console.log("Request body validated successfully");

    // Create organization and user
    const { organization, userId, profileId } = await OrganizationService.createOrganization({
      ...validatedData,
      password: body.password, // Password is already hashed on the client side
    });

    // Return success response without sensitive data
    const safeResponse = {
      message: "Organization created successfully",
      organization: {
        ...organization,
        password: undefined,
        confirmPassword: undefined
      },
      userId,
      profileId,
    };

    return NextResponse.json(safeResponse, { status: 201 });
  } catch (error) {
    console.error("Error creating organization:", error);
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    // Handle DynamoDB errors
    if (error instanceof Error && error.name === "TransactionCanceledException") {
      const message = error.message.toLowerCase();
      if (message.includes("subdomain")) {
        return NextResponse.json({
          message: "Subdomain already exists",
          error: "The chosen subdomain is already taken. Please choose a different one."
        }, { status: 409 });
      }
      if (message.includes("email")) {
        return NextResponse.json({
          message: "Email already exists",
          error: "An organization with this contact email already exists."
        }, { status: 409 });
      }
    }

    // Generic error response
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
} 