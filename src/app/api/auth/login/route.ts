import { NextRequest, NextResponse } from "next/server";
import { DynamoDBService } from "@/lib/dynamodb";
import { createValidatedRoute } from "@/middleware/validation";
import { User } from "@/types/user";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

const db = new DynamoDBService();
const TABLE_NAME = "GEO-Users";

// Rate limiting
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10; // Increased from 5 to 10
const rateLimitMap = new Map<string, { attempts: number; timestamp: number }>();

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  remember: z.boolean().optional(),
});

type LoginInput = z.infer<typeof loginSchema>;

// Ensure this matches the secret in server-auth.ts
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('JWT_SECRET environment variable is not set, using fallback value');
    return 'default-secret-key-for-development';
  }
  return secret;
};

const JWT_SECRET = new TextEncoder().encode(getJwtSecret());

async function login(request: NextRequest, validated: LoginInput) {
  try {
    // Check rate limiting by email instead of IP
    const email = validated.email;
    const now = Date.now();
    const rateLimit = rateLimitMap.get(email);

    if (rateLimit) {
      // Reset if window has passed
      if (now - rateLimit.timestamp > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(email, { attempts: 1, timestamp: now });
      } else if (rateLimit.attempts >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: "Too many login attempts. Please try again later." },
          { status: 429 }
        );
      } else {
        rateLimit.attempts++;
      }
    } else {
      rateLimitMap.set(email, { attempts: 1, timestamp: now });
    }

    // Find user by email
    const result = await db.query<User>(
      TABLE_NAME,
      {
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: { ":email": validated.email },
        IndexName: "EmailIndex"
      }
    );

    console.log('User query result:', result ? `Found ${result.total} users` : 'No result');

    if (!result || result.total === 0) {
      console.log('Login failed: User not found for email:', validated.email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = result.items[0];
    console.log('Found user with ID:', user.userId);

    // Check if user is active
    if (user.status !== "Active") {
      return NextResponse.json(
        { error: "Account is not active. Please contact support." },
        { status: 401 }
      );
    }

    // Check authentication method
    if (user.authMethod === "SAML") {
      return NextResponse.json(
        { error: "This account uses SAML authentication. Please use the SAML login option." },
        { status: 401 }
      );
    }

    // Check if user has a hashed password in metadata
    if (!user.metadata?.hashedPassword) {
      console.error("User has no hashed password in metadata:", user.userId);
      
      // For development/testing purposes, we'll update the user with the provided password
      // In production, this should be handled through a password reset flow
      try {
        // Hash the provided password
        const hashedPassword = await bcrypt.hash(validated.password, 10);
        
        // Update the user with the hashed password in metadata
        // Use the full key structure from the user object
        const key = { 
          userId: user.userId,
          tenantId: user.tenantId 
        };
        
        await db.update<User>(
          TABLE_NAME,
          key,
          { 
            metadata: {
              ...user.metadata,
              hashedPassword,
              lastPasswordChange: Date.now()
            }
          }
        );
        
        console.log("Updated user with hashed password:", user.userId);
      } catch (updateError) {
        console.error("Failed to update user password:", updateError);
        return NextResponse.json(
          { error: "Account configuration error. Please contact support." },
          { status: 500 }
        );
      }
    }

    // Verify password
    try {
      console.log('Attempting password verification');
      const isValid = await bcrypt.compare(validated.password, user.metadata?.hashedPassword || "");
      if (!isValid) {
        console.log('Login failed: Invalid password for user:', user.userId);
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }
      console.log('Password verification successful');
    } catch (bcryptError) {
      console.error("Error comparing passwords:", bcryptError);
      return NextResponse.json(
        { error: "Authentication error. Please try again." },
        { status: 500 }
      );
    }

    // Check if user must change password
    if (user.metadata?.mustChangePassword) {
      console.log('User must change password:', user.userId);
      return NextResponse.json({ 
        mustChangePassword: true, 
        userId: user.userId,
        email: user.email 
      }, { status: 200 });
    }

    // Update last login
    try {
      // Use put instead of update to avoid the zero-length key error
      const updatedUser = {
        ...user,
        lastLogin: Date.now()
      };
      
      await db.put({
        tableName: TABLE_NAME,
        item: updatedUser
      });
    } catch (updateError) {
      console.error("Failed to update last login:", updateError);
      // Continue with login even if lastLogin update fails
    }

    // Create JWT token
    console.log('=== Creating JWT Token ===');
    console.log('Using payload:', {
      sub: user.userId,
      tenantId: user.tenantId,
      email: user.email
    });
    console.log('Secret being used:', getJwtSecret().substring(0, 10) + '...');

    const token = await new SignJWT({
      tenantId: user.tenantId,
      email: user.email
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.userId)
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    console.log('JWT token created successfully');
    console.log('Token preview:', token.substring(0, 10) + '...');
    
    // Set the cookie with specific options that match what Next.js expects
    console.log('Setting authentication cookie');
    const cookieStore = cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/',
    });

    // Also set token in localStorage for client-side access
    // This will be handled by the client-side code

    // Log the login action
    try {
      const { logAction } = await import("@/lib/logging");
      await logAction({
        tenantId: user.tenantId,
        userId: user.userId,
        action: "login",
        details: { email: user.email },
      });
    } catch (logError) {
      console.error("Failed to log login action:", logError);
    }

    // Return user info (without sensitive data)
    const { metadata, ...safeUser } = user;
    return NextResponse.json({
      user: safeUser,
      token, // Include the token in the response
    });
  } catch (error) {
    console.error("Error during login:", error);
    
    // Handle specific DynamoDB errors
    if (error instanceof Error) {
      if (error.name === "ValidationException") {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
      if (error.name === "ResourceNotFoundException") {
        return NextResponse.json(
          { error: "Database configuration error. Please contact support." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

export const POST = createValidatedRoute(login, loginSchema); 