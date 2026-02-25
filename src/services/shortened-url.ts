export interface ShortenedUrl {
  code: string;
  caseId: string;
  url: string;
  createdAt: string;
}

export class ShortenedUrlService {
  static async getByCaseId(caseId: string): Promise<ShortenedUrl | null> {
    try {
      const { tenantId, userId } = getAuthContext();
      const response = await fetch(`/api/shortened-urls?caseId=${caseId}`, {
        headers: {
          'x-tenant-id': tenantId,
          'x-user-id': userId,
        }
      });
      if (!response.ok) throw new Error('Failed to fetch shortened URL');
      const data = await response.json();
      return data.items?.[0] || null;
    } catch (error) {
      console.error('Error fetching shortened URL:', error);
      return null;
    }
  }

  static getFullUrl(code: string): string {
    // Get the base URL from environment variable or default to localhost
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/s/${code}`;
  }
} 