import { CreateShortenedUrlInput, ShortenedUrl } from "@/types/shortened-url";
import { getAuthContext } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export class ShortenedUrlService {
  static async generateUniqueCode(): Promise<string> {
    try {
      const { tenantId, userId } = getAuthContext();
      const response = await fetch(`${API_BASE_URL}/api/shortened-urls/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-id': userId,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate unique code');
      }
      
      const data = await response.json();
      return data.code;
    } catch (error) {
      console.error('Error generating unique code:', error);
      throw error;
    }
  }

  static async create(input: CreateShortenedUrlInput): Promise<ShortenedUrl> {
    try {
      const { tenantId, userId } = getAuthContext();
      const response = await fetch(`${API_BASE_URL}/api/shortened-urls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-id': userId,
        },
        body: JSON.stringify(input)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create shortened URL');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating shortened URL:', error);
      throw error;
    }
  }

  static async getByCaseId(caseId: string): Promise<ShortenedUrl | null> {
    try {
      const { tenantId, userId } = getAuthContext();
      const response = await fetch(`${API_BASE_URL}/api/shortened-urls?caseId=${caseId}`, {
        headers: {
          'x-tenant-id': tenantId,
          'x-user-id': userId,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch shortened URL');
      }
      
      const data = await response.json();
      return data.items?.[0] || null;
    } catch (error) {
      console.error('Error fetching shortened URL:', error);
      return null;
    }
  }

  static async getByCode(code: string): Promise<ShortenedUrl | null> {
    try {
      const { tenantId, userId } = getAuthContext();
      const response = await fetch(`${API_BASE_URL}/api/shortened-urls/${code}`, {
        headers: {
          'x-tenant-id': tenantId,
          'x-user-id': userId,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch shortened URL');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching shortened URL:', error);
      return null;
    }
  }

  static getFullUrl(code: string): string {
    return `https://grs.sh/${code}`;
  }
} 