import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { db, runMigrations } from '@open-flow/db';
import { executeRunBackend } from '@open-flow/engine';
import { WorkflowRunJob } from '@open-flow/shared-types';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null
});

console.log(`[Worker] Connecting to Redis at ${redisUrl}...`);

export const worker = new Worker<WorkflowRunJob>(
  'workflow-runs',
  async (job: Job<WorkflowRunJob>) => {
    const { runId, workflowId, orgId, targetNodeId, versionId, initialInputs } = job.data;
    console.log(`[Worker] Processing job ${job.id} for run ${runId} (workflow: ${workflowId})`);

    // Update status to running
    await new Promise<void>((resolve) => {
      db.run(
        `UPDATE runs SET status = 'running', queue_job_id = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [job.id, runId],
        () => resolve()
      );
    });

    try {
      await executeRunBackend(runId, workflowId, orgId, targetNodeId, versionId, initialInputs);
      
      // Update status to success if not already updated
      await new Promise<void>((resolve) => {
        db.run(
          `UPDATE runs SET status = 'success', completed_at = CURRENT_TIMESTAMP WHERE id = ? AND status != 'failed'`,
          [runId],
          () => resolve()
        );
      });
      console.log(`[Worker] Completed job ${job.id} successfully.`);
    } catch (error: any) {
      console.error(`[Worker] Error executing run ${runId}:`, error);
      await new Promise<void>((resolve) => {
        db.run(
          `UPDATE runs SET status = 'failed', error = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [error.message || String(error), runId],
          () => resolve()
        );
      });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5
  }
);

worker.on('ready', () => {
  console.log('[Worker] Worker process is ready and listening for jobs on queue "workflow-runs".');
});

worker.on('failed', (job: Job<WorkflowRunJob> | undefined, err: Error) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
});

// Run migrations on worker boot
runMigrations().catch(err => console.error('[Worker] DB migration failed:', err));
