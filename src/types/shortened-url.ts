export interface ShortenedUrl {
  code: string;
  tenantId: string;
  caseId: string;
  websiteTemplateId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShortenedUrlInput {
  tenantId: string;
  caseId: string;
  websiteTemplateId: string;
} 