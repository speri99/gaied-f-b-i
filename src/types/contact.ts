export interface ContactRecord {
  UUID: string;
  caseId: string;
  identifier: string;
  timestamp: number;
  status: ContactStatus;
  type: ContactType;
  metadata: ContactMetadata;
  assignedTo: string; // Primary case worker UUID
  backupAssignedTo: string; // Backup case worker UUID
  acknowledgment: {
    status: AcknowledgmentStatus;
    timestamp?: number;
    acknowledgedBy?: string;
    escalationLevel: EscalationLevel;
    lastEscalated?: number;
    notes: ContactNote[];
  };
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
}

export interface SensitiveLocationData {
  UUID: string; // Matches ContactRecord UUID
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    accuracy?: number;
    altitude?: number;
    provider?: string;
  };
  accessLog: LocationAccessLog[];
}

export type ContactStatus = 
  | 'Pending'
  | 'InProgress'
  | 'Completed'
  | 'Failed'
  | 'Cancelled';

export type ContactType =
  | 'Initial'
  | 'FollowUp'
  | 'Emergency'
  | 'Scheduled'
  | 'Unscheduled';

export interface ContactMetadata {
  method: ContactMethod;
  outcome?: string;
  notes?: string;
  duration?: number;
  participants?: string[]; // UUIDs of involved users
  attachments?: ContactAttachment[];
  location?: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
  };
  escalationSettings?: {
    primaryWaitTime: number; // Minutes to wait before escalating to backup
    backupWaitTime: number;  // Minutes to wait before escalating to emergency
    emergencyContact: {
      type: 'phone' | 'sms' | 'email';
      value: string;
    };
  };
}

export type ContactMethod =
  | 'InPerson'
  | 'Phone'
  | 'Video'
  | 'Email'
  | 'Text'
  | 'Other';

export interface ContactAttachment {
  id: string;
  type: string;
  url: string;
  name: string;
  uploadedBy: string;
  uploadedAt: number;
  size: number;
}

export interface LocationAccessLog {
  userId: string;
  timestamp: number;
  action: 'view' | 'export' | 'modify';
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateContactInput {
  caseId: string;
  identifier: string;
  type: ContactType;
  metadata: ContactMetadata;
  location?: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
  };
}

export interface UpdateContactInput {
  status?: ContactStatus;
  type?: ContactType;
  metadata?: Partial<ContactMetadata>;
}

export interface ContactFilter {
  caseId?: string;
  status?: ContactStatus[];
  type?: ContactType[];
  dateRange?: {
    start: number;
    end: number;
  };
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  lastEvaluatedKey?: string;
}

export interface SortConfig {
  field: string;
  order: "asc" | "desc";
}

export type AcknowledgmentStatus = 
  | 'Pending'
  | 'Acknowledged'
  | 'Escalated'
  | 'Missed';

export type EscalationLevel =
  | 'Primary'    // Initial assignment to primary case worker
  | 'Backup'     // Escalated to backup case worker
  | 'Emergency'; // Escalated to emergency contact

export interface ContactNote {
  id: string;
  content: string;
  timestamp: string;
  createdBy: string;
  entityId: string;
  entityType: string;
  tenantId: string;
}

export interface ContactRecordWithoutLocation {
  UUID: string;
  identifier: string;
  timestamp: number;
  dispatched: boolean;
  acknowledgment?: {
    status?: AcknowledgmentStatus;
    timestamp?: number;
    acknowledgedBy?: string;
    escalationLevel?: EscalationLevel;
    lastEscalated?: number;
    notes: ContactNote[];
  };
}
