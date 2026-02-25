import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Get the JWT secret - must match exactly with login route
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('JWT_SECRET environment variable is not set, using fallback value');
    return 'default-secret-key-for-development';
  }
  return secret;
};

// Create the secret key buffer
const JWT_SECRET = new TextEncoder().encode(getJwtSecret());

// Server-side authentication utilities
// This file should not have 'use client' directive

export function getServerAuthContext(request: Request) {
  // First try to get auth from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    try {
      // Parse the JWT without verifying (verification happens on server)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64, 'base64').toString());

      return {
        tenantId: payload.tenantId,
        userId: payload.sub,
      };
    } catch (error) {
      console.error('Error parsing auth token:', error);
    }
  }

  // Fallback to custom headers if Authorization header is not present or invalid
  const tenantId = request.headers.get('x-tenant-id');
  const userId = request.headers.get('x-user-id');

  if (tenantId && userId) {
    return {
      tenantId,
      userId,
    };
  }

  return null;
} 