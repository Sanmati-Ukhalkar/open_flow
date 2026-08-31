import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { WorkflowRunJob, OpenFlowJobPayload } from '@open-flow/shared-types';

export const WORKFLOW_QUEUE_NAME = 'workflow-runs';

export const getRedisConnectionOptions = () => {
  const urlStr = process.env.REDIS_URL || 'redis://127.0.0.1:6380';
  try {
    const u = new URL(urlStr);
    return {
      host: u.hostname || '127.0.0.1',
      port: parseInt(u.port || '6380', 10)
    };
  } catch {
    return { host: '127.0.0.1', port: 6380 };
  }
};

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6380';
export const redisConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });

export const workflowQueue = new Queue<OpenFlowJobPayload | any>(WORKFLOW_QUEUE_NAME, {
  connection: getRedisConnectionOptions()
});

export async function enqueueWorkflowRun(
  jobData: Partial<WorkflowRunJob> & { runId: string; workflowId: string; orgId: string } | any
): Promise<string> {
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
