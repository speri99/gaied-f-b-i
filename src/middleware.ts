import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuth } from "@/middleware/auth";
import { OrganizationService } from "@/lib/services/organization.service";
import { getToken } from 'next-auth/jwt';

// Add paths that should be protected by billing status check
const PROTECTED_PATHS = [
  "/dashboard",
  "/settings",
  "/templates",
  "/contacts",
  "/reports",
];

// Add paths that should be restricted when organization is not approved
const RESTRICTED_PATHS = [
  "/cases/new",
  "/cases/create",
  "/cases/edit",
  "/cases/update",
  "/cases/delete",
];

// Add paths that should be accessible without authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/onboarding",
  "/onboarding/pending",
  "/billing/pending",
  "/billing/setup",
  "/error",
  "/reset-password",
  "/callback",
  "/status",
  "/signout",
  "/json/list",
  "/json/version"
];

export async function middleware(request: NextRequest) {
  console.log("Middleware: Processing request for path:", request.nextUrl.pathname);
  
  // Handle API routes with the API middleware
  if (request.nextUrl.pathname.startsWith('/api')) {
    return apiMiddleware(request);
  }
  
  // Allow access to public paths without authentication
  if (PUBLIC_PATHS.some(path => request.nextUrl.pathname === path)) {
    console.log("Middleware: Path is public, allowing access:", request.nextUrl.pathname);
    return NextResponse.next();
  }

  console.log("Middleware: Checking authentication for path:", request.nextUrl.pathname);
  console.log("Middleware: Cookies:", request.cookies.getAll());
  
  const authenticatedRequest = await verifyAuth(request);

  if(authenticatedRequest && authenticatedRequest.status != undefined){
    console.log('Tenant does not exist,redirect to tenant signup');
    switch (authenticatedRequest.status) {
      case "Tenant not exist":
        console.log("Tenant does not exist, redirecting to tenant signup");
        return NextResponse.redirect(new URL("/onboarding", request.url));

      case "Tenant not active":
        console.log("Tenant does not exist, redirecting to tenant signup");
        return NextResponse.redirect(new URL("/status?type=tenant-not-active", request.url));

      case "User not exist":
        console.log("User is inactive, redirecting to inactive notice");
        return NextResponse.redirect(new URL("/status?type=user-created", request.url));
      
      case "User not active":
        console.log("User is banned, redirecting to banned page");
        return NextResponse.redirect(new URL("/status?type=tenant-created", request.url));
      
      default:
        // No action — status is not one of the handled ones.
        break;
    }
  }
  
  if (!authenticatedRequest) {
    console.log("Middleware: Authentication failed, redirecting to login -------"+request.nextUrl.pathname);
    return NextResponse.redirect(new URL("/aws-login", request.url));
  }

  console.log("Middleware: Authentication successful, user:", authenticatedRequest.user.email);
  console.log("Middleware: Tenant ID:", authenticatedRequest.user.tenantId);

  
  // Always check for organization
  try {
    console.log("Middleware: Getting organization for user tenantId:", authenticatedRequest.user.tenantId);
    // Get organization by tenantId
    const organization = await OrganizationService.getOrganizationByTenantId(
      authenticatedRequest.user.tenantId
    );

    if (!organization) {
      console.log("Middleware: No organization found for user:", authenticatedRequest.user.email);
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    
    console.log("Middleware: Organization found:", organization.id, "Status:", organization.status);
    console.log("Middleware: Organization tenant ID:", organization.tenantId);
    console.log("Middleware: User tenant ID:", authenticatedRequest.user.tenantId);

    // Verify tenant ownership
    if (organization.tenantId !== authenticatedRequest.user.tenantId) {
      console.error("Middleware: Tenant ID mismatch between user and organization:", {
        userTenantId: authenticatedRequest.user.tenantId,
        orgTenantId: organization.tenantId
      });
      return NextResponse.redirect(new URL("/error", request.url));
    }

    // Check if the path should be restricted when organization is not approved
    const isRestrictedPath = RESTRICTED_PATHS.some(path => 
      request.nextUrl.pathname.startsWith(path)
    );
    
    console.log("Middleware: Is restricted path:", isRestrictedPath);

    if (isRestrictedPath && organization.status !== "Approved") {
      console.log("Middleware: Organization not approved, access to path restricted:", request.nextUrl.pathname);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Check if the path should be protected by billing status
    const isProtectedPath = PROTECTED_PATHS.some(path => 
      request.nextUrl.pathname.startsWith(path)
    );
    
    console.log("Middleware: Is protected path:", isProtectedPath);

    if (isProtectedPath) {
      // Check billing status
      if (organization.billingType === "Manual" && !organization.billingApproved) {
        console.log("Middleware: Manual billing not approved:", organization.id);
        return NextResponse.redirect(new URL("/billing/pending", request.url));
      }

      // For Stripe billing, check if payment method is set up
      if (organization.billingType === "Stripe" && !organization.stripeCustomerId) {
        console.log("Middleware: Stripe billing not set up:", organization.id);
        return NextResponse.redirect(new URL("/billing/setup", request.url));
      }
    }
  } catch (error) {
    console.error("Error checking organization status:", error);
    return NextResponse.redirect(new URL("/error", request.url));
  }

  console.log("Middleware: All checks passed, allowing access to:", request.nextUrl.pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};

export async function apiMiddleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Skip auth check for login and public routes
  if (
    request.nextUrl.pathname.startsWith('/api/auth/aws-login') ||
    request.nextUrl.pathname.startsWith('/api/auth/aws-logout') ||
    request.nextUrl.pathname.startsWith('/api/organizations') ||
    request.nextUrl.pathname.startsWith('/api/auth/token') ||
    request.nextUrl.pathname.startsWith('/api/auth/register') ||
    request.nextUrl.pathname.startsWith('/api/auth/logout') ||
    request.nextUrl.pathname.startsWith('/api/public') ||
    request.nextUrl.pathname.match(/^\/api\/users\/[^/]+\/password$/)
  ) {
    return NextResponse.next();
  }

  // Try cookie-based authentication first
  const authenticatedRequest = await verifyAuth(request);
  if (authenticatedRequest?.user) {
    // Add the user info to the request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-verified-tenant-id', authenticatedRequest.user.tenantId);
    requestHeaders.set('x-tenant-id', authenticatedRequest.user.tenantId);
    requestHeaders.set('x-user-id', authenticatedRequest.user.userId);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // If cookie auth failed, try token-based auth
  // try {
  //   // Get the token from the Authorization header
  //   const authHeader = request.headers.get('Authorization');
  //   let token;
    
  //   if (authHeader && authHeader.startsWith('Bearer ')) {
  //     const tokenString = authHeader.substring(7);
  //     try {
  //       // Parse the JWT token
  //       const base64Url = tokenString.split('.')[1];
  //       const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  //       const payload = JSON.parse(atob(base64));
  //       token = {
  //         tenantId: payload.tenantId,
  //         sub: payload.sub
  //       };
  //     } catch (error) {
  //       console.error('Error parsing token:', error);
  //     }
  //   }
    
  //   if (!token) {
  //     return new NextResponse(
  //       JSON.stringify({ error: 'Authentication required' }),
  //       { status: 401, headers: { 'content-type': 'application/json' } }
  //     );
  //   }

  //   // Get the tenant ID from the token
  //   const tokenTenantId = token.tenantId as string;
    
  //   if (!tokenTenantId) {
  //     return new NextResponse(
  //       JSON.stringify({ error: 'Invalid token: missing tenant ID' }),
  //       { status: 401, headers: { 'content-type': 'application/json' } }
  //     );
  //   }

  //   // Add the verified tenant ID to the request headers
  //   const requestHeaders = new Headers(request.headers);
  //   requestHeaders.set('x-verified-tenant-id', tokenTenantId);
  //   requestHeaders.set('x-tenant-id', tokenTenantId);
  //   requestHeaders.set('x-user-id', token.sub);

  //   return NextResponse.next({
  //     request: {
  //       headers: requestHeaders,
  //     },
  //   });
  // } catch (error) {
  //   console.error('Error in API middleware:', error);
  //   return new NextResponse(
  //     JSON.stringify({ error: 'Authentication failed' }),
  //     { status: 401, headers: { 'content-type': 'application/json' } }
  //   );
  // }
}

export const apiConfig = {
  matcher: '/api/:path*',
};
