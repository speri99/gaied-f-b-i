import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { createValidatedRoute } from "@/middleware/validation";
import { User, CreateUserInput, UpdateUserInput, UserFilter } from "@/types/user";
import { createUserSchema, updateUserSchema } from "@/lib/validations/user";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_USERS_TABLE;

if (!TABLE_NAME) {
  throw new Error("DYNAMODB_USERS_TABLE is not defined in environment variables");
}

// GET /api/users
async function getUsers(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 401 }
      );
    }

    if (!TABLE_NAME) {
      console.error("DYNAMODB_USERS_TABLE is not defined");
      return NextResponse.json(
        { error: "Database configuration error" },
        { status: 500 }
      );
    }

    console.log("Fetching users with table name:", TABLE_NAME);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const lastKey = searchParams.get("lastKey");
    
    // Parse filters from query params
    const filter: UserFilter = {
      status: searchParams.getAll("status") as any[],
      role: searchParams.getAll("role") as any[],
      securityProfile: searchParams.get("securityProfile") || undefined,
      search: searchParams.get("search") || undefined,
      dateRange: searchParams.get("dateRange") 
        ? JSON.parse(searchParams.get("dateRange")!)
        : undefined,
    };

    console.log("Applying filters:", filter);

    // Query by tenant ID
    const keyConditionExpression = "tenantId = :tenantId";
    const expressionValues: Record<string, any> = {
      ":tenantId": tenantId,
    };
    const expressionNames: Record<string, string> = {};

    // Build additional filter expressions
    let filterExpressions: string[] = [];

    if (filter.status?.length) {
      filterExpressions.push("#status IN (:statuses)");
      expressionValues[":statuses"] = filter.status;
      expressionNames["#status"] = "status";
    }

    if (filter.role?.length) {
      filterExpressions.push("#role IN (:roles)");
      expressionValues[":roles"] = filter.role;
      expressionNames["#role"] = "role";
    }

    if (filter.securityProfile) {
      filterExpressions.push("contains(securityProfiles, :securityProfile)");
      expressionValues[":securityProfile"] = filter.securityProfile;
    }

    if (filter.search) {
      filterExpressions.push("(contains(#email, :search) OR contains(#firstName, :search) OR contains(#lastName, :search))");
      expressionValues[":search"] = filter.search;
      expressionNames["#email"] = "email";
      expressionNames["#firstName"] = "firstName";
      expressionNames["#lastName"] = "lastName";
    }

    if (filter.dateRange) {
      filterExpressions.push("#createdAt BETWEEN :startDate AND :endDate");
      expressionValues[":startDate"] = filter.dateRange.start;
      expressionValues[":endDate"] = filter.dateRange.end;
      expressionNames["#createdAt"] = "createdAt";
    }

    // Only include filter expression if we have additional filters
    const filterExpression = filterExpressions.length > 0 
      ? filterExpressions.join(" AND ")
      : undefined;

    console.log("DynamoDB query params:", {
      tableName: TABLE_NAME,
      keyConditionExpression,
      filterExpression,
      expressionValues,
      expressionNames,
      limit
    });

    const response = await db.query(
      TABLE_NAME,
      {
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionValues,
        ExpressionAttributeNames: Object.keys(expressionNames).length > 0 ? expressionNames : undefined,
        Limit: limit,
        ExclusiveStartKey: lastKey ? JSON.parse(lastKey) : undefined,
      }
    );

    console.log("DynamoDB query response:", {
      itemCount: response.items?.length || 0,
      hasMore: !!response.lastEvaluatedKey
    });

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error("Error getting users:", error);
    
    // Check if it's an AWS error
    const awsError = error as any;
    if (awsError.name === 'ResourceNotFoundException') {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }
    
    if (awsError.name === 'ValidationException') {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get users", details: awsError.message },
      { status: 500 }
    );
  }
}

// POST /api/users
async function createUser(request: NextRequest, validated: CreateUserInput) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const now = Date.now();
    const userId = `USER-${uuidv4()}`;

    let password = validated.password;
    let tempPassword: string | undefined;
    let mustChangePassword = false;
    let hashedPassword: string | undefined;
    if (validated.authMethod === "Password") {
      if (!password) {
        // Generate a temp password if not provided
        tempPassword = crypto.randomBytes(8).toString("base64");
        password = tempPassword;
        mustChangePassword = true;
      }
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    const newUser: User = {
      userId,
      tenantId,
      email: validated.email,
      firstName: validated.firstName,
      lastName: validated.lastName,
      phoneNumber: validated.phoneNumber,
      role: validated.role,
      status: "Active",
      authMethod: validated.authMethod,
      smsEnabled: validated.smsEnabled || false,
      securityProfiles: validated.securityProfiles,
      createdAt: now,
      updatedAt: now,
      metadata: {
        ...(hashedPassword && { hashedPassword }),
        ...(tempPassword && { tempPassword }),
        ...(mustChangePassword && { mustChangePassword }),
      },
    };

    await db.put({ tableName: TABLE_NAME, item: newUser });
    // Return temp password in response for now (remove in production)
    return NextResponse.json({ ...newUser, tempPassword }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

// PATCH /api/users/:id
async function updateUser(
  request: NextRequest,
  validated: UpdateUserInput,
  { params }: { params: { id: string } }
) {
  try {
    const existingUser = await db.get<User>(TABLE_NAME, { userId: params.id });
    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const updates: Partial<User> = {
      ...validated,
      updatedAt: Date.now(),
    };

    if (validated.password) {
      const hashedPassword = await bcrypt.hash(validated.password, 10);
      updates.metadata = {
        ...existingUser.metadata,
        hashedPassword,
        lastPasswordChange: Date.now(),
      };
    }

    const updatedUser = await db.update<User>(
      TABLE_NAME,
      { userId: params.id },
      updates
    );

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/:id
async function deleteUser(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Soft delete by updating status to Deleted
    await db.update<User>(
      TABLE_NAME,
      { userId: params.id },
      { 
        status: "Deleted",
        updatedAt: Date.now(),
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

// Export the route handlers
export const GET = getUsers;
export const POST = createValidatedRoute(createUser, createUserSchema);
export const PATCH = createValidatedRoute(updateUser, updateUserSchema);
export const DELETE = deleteUser; 