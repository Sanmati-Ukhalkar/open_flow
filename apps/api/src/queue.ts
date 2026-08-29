import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true
});

export const WORKFLOW_QUEUE_NAME = 'workflow-runs';

export const workflowQueue = new Queue(WORKFLOW_QUEUE_NAME, {
  connection: redisConnection
});

export async function enqueueWorkflowRun(jobData: any) {
  try {
    const job = await workflowQueue.add('WorkflowRunJob', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });
    return job.id;
  } catch (err) {
    console.warn(`[Queue] Failed to enqueue job into Redis, falling back to direct execution:`, err);
    return null;
  }
}
