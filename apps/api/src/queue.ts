import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { WorkflowRunJob, OpenFlowJobPayload } from '@open-flow/shared-types';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6380';

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  connectTimeout: 2000,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 200, 2000)
});

export const WORKFLOW_QUEUE_NAME = 'workflow-runs';

export const workflowQueue = new Queue<OpenFlowJobPayload | any>(WORKFLOW_QUEUE_NAME, {
  connection: redisConnection
});

export async function enqueueWorkflowRun(jobData: Partial<WorkflowRunJob> & { runId: string; workflowId: string; orgId: string } | any): Promise<string> {
  const job = await workflowQueue.add('WorkflowRunJob', jobData, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  });
  if (!job.id) {
    throw new Error('BullMQ failed to assign a job ID');
  }
  return job.id;
}
