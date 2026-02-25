'use client';

// This is a temporary development auth context
// TODO: Replace with proper authentication implementation

import bcrypt from "bcryptjs";
import { useState, useEffect } from "react";
import { User } from '@/types/user';

// Helper function to get cookie value
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Helper function to set cookie
function setCookie(name: string, value: string, days = 7) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

// Helper function to remove cookie
function removeCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// Cache for auth context to prevent multiple requests
let authContextCache: { tenantId: string; userId: string } | null = null;
let authContextPromise: Promise<{ tenantId: string; userId: string } | null> | null = null;

// Function to get auth context with caching
export async function getAuthContext() {
  // Return cached result if available
  if (authContextCache) {
    return authContextCache;
  }

  // If there's already a request in progress, return its promise
  if (authContextPromise) {
    return authContextPromise;
  }

  // Create new request
  authContextPromise = fetch('/api/auth/context', {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    }
  })
    .then(async res => {
      if (!res.ok) {
        // Log the error response for debugging
        const errorText = await res.text();
        console.error('Auth context error:', {
          status: res.status,
          statusText: res.statusText,
          body: errorText
        });
        throw new Error('Failed to get auth context');
      }
      return res.json();
    })
    .then(data => {
      if (!data.tenantId || !data.userId) {
        throw new Error('Invalid auth context');
      }
      // Cache the result
      authContextCache = {
        tenantId: data.tenantId,
        userId: data.userId,
      };
      return authContextCache;
    })
    .catch(error => {
      console.error('Error getting auth context:', error);
      // Clear cache on error
      authContextCache = null;
      return null;
    })
    .finally(() => {
      // Clear the promise so future requests can try again
      authContextPromise = null;
    });

  return authContextPromise;
}

// Utility function to create headers with auth token
export async function createAuthHeaders() {
  const authContext = await getAuthContext();
  if (!authContext) {
    throw new Error('Authentication required');
  }

  return {
    'Content-Type': 'application/json',
    'x-tenant-id': authContext.tenantId,
    'x-user-id': authContext.userId,
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    const checkAuth = async () => {
      try {
        // Get auth context
        const authContext = await getAuthContext();
        if (!authContext) {
          throw new Error('Not authenticated');
        }

        // Get user data
        const userResponse = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        
        if (!userResponse.ok) {
          // Log the error response for debugging
          const errorText = await userResponse.text();
          console.error('User data error:', {
            status: userResponse.status,
            statusText: userResponse.statusText,
            body: errorText
          });
          throw new Error('Failed to fetch user data');
        }
        
        const data = await userResponse.json();
        if (mounted) {
          setUser(data.user);
          setIsAuthenticated(true);
          setLoading(false);
          retryCount = 0; // Reset retry count on success

          // If we're on the login page and we're authenticated, redirect to dashboard
          if (typeof window !== 'undefined' && window.location.pathname === '/login') {
            window.location.href = '/dashboard';
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (mounted) {
          // Only clear state and redirect if we've exhausted retries
          if (retryCount >= maxRetries) {
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            
            // Clear the auth context cache on error
            authContextCache = null;
            
            // Only redirect to login if we're not already on the login page
            // if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            //   window.location.href = '/login';
            // }
          } else {
            // Retry after a short delay
            retryCount++;
            console.log(`Retrying auth check (attempt ${retryCount}/${maxRetries})`);
            setTimeout(checkAuth, 1000);
          }
        }
      }
    };

    checkAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      // Clear the auth context cache on login
      authContextCache = null;

      setUser(data.user);
      setIsAuthenticated(true);

      // After successful login, redirect to dashboard
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }

      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Clear the auth context cache on logout
      authContextCache = null;
      
      setUser(null);
      setIsAuthenticated(false);
      
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    createAuthHeaders,
  };
}

// Add server-side auth context function
export function getServerAuthContext(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

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
    return null;
  }
} 