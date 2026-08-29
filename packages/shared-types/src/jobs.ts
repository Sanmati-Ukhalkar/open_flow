export interface BaseRunJob {
  runId: string;
  workflowId: string;
  orgId: string;
  userId?: string;
  versionId?: string;
  timestamp: number;
}

export interface WorkflowRunJob extends BaseRunJob {
  type: 'workflow_run';
  targetNodeId?: string;
  initialInputs?: Record<string, any>;
}

export interface ScheduledRunJob extends BaseRunJob {
  type: 'scheduled_run';
  cronSchedule: string;
  deploymentId: string;
}

export interface WebhookRunJob extends BaseRunJob {
  type: 'webhook_run';
  payload: Record<string, any>;
  headers?: Record<string, any>;
}

export interface NodeRetryJob extends BaseRunJob {
  type: 'node_retry';
  targetNodeId: string;
}

export type OpenFlowJobPayload = WorkflowRunJob | ScheduledRunJob | WebhookRunJob | NodeRetryJob;

export interface WorkflowRunStatus {
  id: string;
  workflow_id: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  error?: string;
  queue_job_id?: string;
}
