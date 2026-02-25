export type WorkflowStatus = 'ACTIVE' | 'DRAFT' | 'COMPLETED' | 'FAILED';

import { XYPosition } from '@xyflow/react';

interface WorkflowNode {
  id: string;
  type: string;
  position: XYPosition;
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface WorkflowSequence {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}


export interface Workflow {
  tenantId: string;                // Tenant identifier
  workflowId?: string;              // Unique workflow ID (primary key)
  workflowName: string;  
  workflowSequence:WorkflowSequence;  
  workflowStepFunction?:any;    // Descriptive workflow name
  status: WorkflowStatus;         // Status enum
  createdBy: string;              // Creator ID or name
  createdAt: string;              // ISO 8601 timestamp
  updatedBy?: string;             // Optional updater ID or name
  updatedAt?: string;             // Optional ISO 8601 timestamp
}