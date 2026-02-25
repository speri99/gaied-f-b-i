import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { DynamoDBService } from "@/lib/dynamodb";
import { User } from "@/types/user";
import { getServerAuthContext } from "@/lib/server-auth";
import { CognitoJwtVerifier } from "aws-jwt-verify";
const db = new DynamoDBService();

// Get the JWT secret - must match exactly with login route and server-auth
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('JWT_SECRET environment variable is not set, using fallback value');
    return 'default-secret-key-for-development';
  }
  return secret;
};
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

// Base issuer for JWKS, validation, and identity
export const COGNITO_ISSUER = 'https://cognito-idp.' + process.env.COGNITO_REGION + '.amazonaws.com/' + USER_POOL_ID;

// Public JWKs endpoint for JWT verification
export const COGNITO_JWKS_URL = COGNITO_ISSUER+'/.well-known/jwks.json';

export interface AuthenticatedRequest extends NextRequest {
  user: Omit<User, "hashedPassword">;
}
/*
  Get the Token from the session, verify it, once succesfull get the user from db and send it in response
*/
export async function verifyAwsAuth(request: NextRequest): Promise<AuthenticatedRequest | null> {
  try {
    // Get token from cookie or Authorization header
    let token = request.cookies.get("token")?.value;
    let tenant_id=request.cookies.get("tenant_id")?.value;
    console.log("Token found, attempting verification");
    // Verify token
    try {
      try {
        const userPoolId = 'us-west-2_2fafEaDIB';
        const verifier = CognitoJwtVerifier.create({
          userPoolId,
          tokenUse: 'id', // or 'id' for ID tokens
          clientId: CLIENT_ID, // Optional, only if you need to verify the token audience
        });

        const payload = await verifier.verify(token);
        if (!payload.sub && !tenant_id) {
          console.error("Invalid token payload - missing required fields");
          return null;
        }
        console.log('Decoded JWT:', payload);
      } catch (err) {
        console.error('Error verifying JWT:', err);
      }
      const user:User={
        phoneNumber: '+13032495156',
        metadata: {
          mustChangePassword: false,
          hashedPassword: '$2b$10$JFq4kQwgFAeGNLXWNI1WW.tk7TE8qkIdygn5Arwhy5HPV181vjLUq',
          lastPasswordChange: 1749140873595
        },
        securityProfiles: ['PROF-a3c5ab5e-6b70-4517-9c62-f08e42ab1438'],
        lastName: 'Peri',
        status: 'Active',
        tenantId: 'TENANT-001',
        updatedBy: 'system',
        email: 'sharma.peri@gmail.com',
        firstName: 'Sharma',
        lastLogin: 1749979730842,
        authMethod: 'Password',
        updatedAt: '2025-06-05T16:27:53.595Z',
        userId: 'USER-ebf3ad5d-a32c-4167-b4fe-6d66e68d22fb',
        smsEnabled: false,
        role: "Admin",
        createdAt: "",
        createdBy: ""
      };
      const { hashedPassword: _, ...safeUser } = user;
        console.log("Authenticated user:",user);
        // Add user to request
        return Object.assign(request, { user: safeUser }) as AuthenticatedRequest;
    }catch (verifyError: any) {
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
  return async function(request: NextRequest) {
    const authenticatedRequest = await verifyAwsAuth(request);

    if (!authenticatedRequest && !options.allowUnauthorized) {
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