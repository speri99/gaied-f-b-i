export interface TimelineEvent {
  title: string;
  timestamp: string;
  description: string;
}

export interface Case {
  tenantId: string;
  Identifier: string;
  firstName: string;
  lastName: string;
  VictimPhone: string;
  secondaryPhone?: string;
  CaseManager: string;
  CaseManagerEmail: string;
  CaseManagerPhone: string;
  BackupCaseManager?: string;
  BackupCaseManagerEmail?: string;
  BackupCaseManagerPhone?: string;
  status: CaseStatus;
  caseType: CaseType;
  priority: CasePriority;
  ReportedAbuser?: string;
  notes?: string;
  smsNotifications?: boolean;
  backupSmsNotifications?: boolean;
  tags?: string[];
  contactMethods?: ContactMethod[];
  websiteTemplateId: string;
  workflowId?:string;
  metadata: CaseMetadata;
  createdAt?: string;
  updatedAt?: string;
  VictimName: string;
  CaseManagerPhone: string;
  BackupCaseManager: string;
  BackupCaseManagerEmail: string;
  BackupCaseManagerPhone: string;
  caseworkerNotes?: string;
  summary?: string;
  lastSummaryRefresh?: string;
  followUpDate?: string;
  smsNotifications: boolean;
  backupSmsNotifications: boolean;
  createdBy: string;
  updatedBy: string;
  metadata: CaseMetadata;
  Status: string;
  CreatedAt: string;
  UpdatedAt: string;
  AssignedTo: string;
  AdditionalPhones?: string[];
  Notes?: string[];
  Priority?: string;
  EscalationLevel?: string;
  LastContact?: string;
  NextFollowUp?: string;
  CaseType?: string;
  RiskLevel?: string;
  Location?: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
  };
}

export type CaseStatus = "Active" | "Pending" | "Closed";
export type CasePriority = "Low" | "Medium" | "High" | "Critical";
export type CaseType = "Child Abuse" | "Domestic Violence" | "Elder Abuse";
export type ContactMethod = "email" | "phone" | "text";

export interface CaseMetadata {
  caseType: string;
  category: string;
  tags: string[];
  description: string;
  notes: string[];
}

export interface CaseAttachment {
  id: string;
  name: string;
  caseType: string;
  url: string;
  uploadedBy: string;
  uploadedAt: number;
  size: number;
}

export interface CaseTimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description: string;
  timestamp: number;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

export type CreateCaseInput = Case;
export type UpdateCaseInput = Partial<Case>;

export interface CaseFilter {
  status?: CaseStatus[];
  priority?: CasePriority[];
  caseType?: CaseType[];
  dateRange?: {
    start: number;
    end: number;
  };
  search?: string;
}

// Type for DynamoDB record format
export interface DynamoDBCase {
  tenantId: { S: string };
  identifier: { S: string };
  VictimName: { S: string };
  CaseManager: { S: string };
  CaseManagerEmail: { S: string };
  CaseManagerPhone: { S: string };
  BackupCaseManager: { S: string };
  BackupCaseManagerEmail: { S: string };
  BackupCaseManagerPhone: { S: string };
  ReportedAbuser: { S: string };
  status?: { S: string };
  caseType?: { S: string };
  priority?: { S: string };
  notes?: { S: string };
  caseworkerNotes?: { S: string };
  summary?: { S: string };
  lastUpdated?: { S: string };
  followUpDate?: { S: string };
  smsNotifications?: { BOOL: boolean };
  backupSmsNotifications?: { BOOL: boolean };
  tags?: { L: { S: string }[] };
  createdAt?: { N: string };
  updatedAt?: { N: string };
  createdBy?: { S: string };
  updatedBy?: { S: string };
  metadata?: { M: Record<string, any> };
  websiteTemplateId?: { S: string };
}
