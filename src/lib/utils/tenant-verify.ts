import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function verifyTenantAccess(request: NextRequest) {
  const token = await getToken({ req: request });
  
  if (!token) {
    throw new Error('Authentication required');
  }

  const tokenTenantId = token.tenantId as string;
  
  if (!tokenTenantId) {
    throw new Error('Invalid token: missing tenant ID');
  }

  // For GET requests, verify the tenant ID in the URL
  if (request.method === 'GET') {
    const urlTenantId = request.nextUrl.searchParams.get('tenantId');
    if (urlTenantId && urlTenantId !== tokenTenantId) {
      throw new Error('Unauthorized access to tenant data');
    }
  }

  // For POST/PUT/DELETE requests, verify the tenant ID in the body
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    const body = await request.json();
    if (body.tenantId && body.tenantId !== tokenTenantId) {
      throw new Error('Unauthorized access to tenant data');
    }
  }

  return tokenTenantId;
}

export function getVerifiedTenantId(request: NextRequest): string {
  // Try both header formats for backward compatibility
  const tenantId = request.headers.get('x-verified-tenant-id') || request.headers.get('x-tenant-id');
  
  if (!tenantId) {
    throw new Error('Missing verified tenant ID');
  }
  
  return tenantId;
} 