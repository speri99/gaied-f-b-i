import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { DynamoDBService } from "@/lib/dynamodb";
import { User } from "@/types/user";
import { getServerAuthContext } from "@/lib/server-auth";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { TenantService } from "@/lib/services/tenant.service";
import { Tenant } from "@/types/tenant";
const db = new DynamoDBService();
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
// Get the JWT secret - must match exactly with login route and server-auth
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('JWT_SECRET environment variable is not set, using fallback value');
    return 'default-secret-key-for-development';
  }
  return secret;
};

const JWT_SECRET = new TextEncoder().encode(getJwtSecret());

export interface AuthenticatedRequest extends NextRequest {
  user?: Omit<User, "hashedPassword">;
  status?:string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthenticatedRequest | null > {
  try {
    // Get token from cookie or Authorization header
    let token = request.cookies.get("token")?.value;
    let tenant_id = request.cookies.get("tenant_id")?.value;
    let email;
    if (!token) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
    if (!token) {
      console.log("No token found in cookies or Authorization header");
      return null;
    }

    console.log("Token found, attempting verification");
    // Verify token
    try {
      const userPoolId = USER_POOL_ID;
      const verifier = CognitoJwtVerifier.create({
        userPoolId,
        tokenUse: 'id', // or 'id' for ID tokens
        clientId: CLIENT_ID, // Optional, only if you need to verify the token audience
      });

      const payload = await verifier.verify(token);
      if (
        payload.identities &&
        Array.isArray(payload.identities) &&
        payload.identities.length > 0 &&
        payload.identities[0].userId
      ) {
        email = payload.identities[0].userId;
      } else {
        email = payload.email;
      }
      console.log("Token Payload-----" + payload);
      if (!payload.sub && !tenant_id) {
        console.error("Invalid token payload - missing required fields");
        return null;
      }

      const tenatResults = await db.query<Tenant>(
        "GEO-Tenants",
        {
          KeyConditionExpression: "id = :tenantId",
          ExpressionAttributeValues: { ":tenantId": tenant_id },
        }
      );
      let existingTenant;
      if (tenatResults && tenatResults.items.length > 0) {
        existingTenant = tenatResults.items[0];
      }
      if (!existingTenant) {
        console.log("Tenant not exists")
        //create a new Tenant account
        return Object.assign(request, { status:'Tenant not exist' }) as AuthenticatedRequest;
      }
      if (existingTenant && existingTenant.status !== 'Approved') {
        return Object.assign(request, { status:'Tenant not active' }) as AuthenticatedRequest;
      }

      console.log("Tenant exists and active- lets check user exists or not");
      let user: User;
      const result = await db.query<User>(
        "GEO-Users",
        {
          KeyConditionExpression: "email = :email",
          ExpressionAttributeValues: { ":email": email },
          IndexName: "EmailIndex"
        }
      );
      if (result && result.items.length > 0) {
        user = result.items[0];
      }

      //User not found -- Access Denied
      if (!user) {
        console.error("User not found");
        return Object.assign(request, { status:'User not exist' }) as AuthenticatedRequest;
      }
      //User not active -- Access Denied
      if (user && user.status !== 'Active') {
        console.log("User is inactive");
        return Object.assign(request, { status:'User not exist' }) as AuthenticatedRequest;
      }
      // Verify tenant ownership -- Access Denied
      if (user.tenantId !== tenant_id) {
        console.error("Tenant ID mismatch:", {
          tokenTenantId: payload.tenantId,
          userTenantId: user.tenantId
        });
        return Object.assign(request, { status:'Tenant mismatch' }) as AuthenticatedRequest;
      }
      const { hashedPassword: _, ...safeUser } = user;
      return Object.assign(request, { user: safeUser, isExistingTenant: false }) as AuthenticatedRequest;
    } catch (verifyError: any) {
      if (verifyError.code === 'ERR_JWT_EXPIRED') {
        console.error('JWT token has expired');
      } else if (verifyError.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
        console.error('JWT signature verification failed');
        console.error('Secret used for verification:', getJwtSecret().substring(0, 10) + '...');
      } else {
        console.error('JWT verification error:', verifyError.code || verifyError.message);
      }
      return null;
    }
  } catch (error) {
    console.error("Auth verification failed:", error);
    return null;
  }
}

export function createAuthenticatedRoute(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  options: { allowUnauthorized?: boolean } = {}
) {
  return async function (request: NextRequest) {
    const authenticatedRequest = await verifyAuth(request);

    if (!authenticatedRequest?.user && !options.allowUnauthorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return handler(authenticatedRequest || request as AuthenticatedRequest);
  };
}

// Combine authentication and validation
export function createAuthenticatedValidatedRoute<T>(
  handler: (request: AuthenticatedRequest, validated: T) => Promise<NextResponse>,
  schema: any,
  options: { allowUnauthorized?: boolean } = {}
) {
  return createAuthenticatedRoute(
    async (request: AuthenticatedRequest) => {
      try {
        const body = await request.json();
        const validated = await schema.parseAsync(body);
        return handler(request, validated);
      } catch (error) {
        return NextResponse.json(
          { error: "Validation failed", details: error },
          { status: 400 }
        );
      }
    },
    options
  );
}