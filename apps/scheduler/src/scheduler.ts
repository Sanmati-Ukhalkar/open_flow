import dotenv from 'dotenv';
import cron from 'node-cron';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { db, runMigrations } from '@open-flow/db';
import { ScheduledRunJob } from '@open-flow/shared-types';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null
});

const workflowQueue = new Queue('workflow-runs', {
  connection: redisConnection
});

console.log('[Scheduler] Scheduler service starting up...');

// Run ticker every minute to check active deployments with cron triggers
cron.schedule('* * * * *', async () => {
  console.log('[Scheduler] Checking scheduled workflow deployments...');
  
  db.all(
    `SELECT d.id as deployment_id, d.workflow_id, d.org_id, d.version_id, t.config
     FROM deployments d
     JOIN triggers t ON d.id = t.deployment_id
     WHERE d.status = 'active' AND t.type = 'cron-trigger'`,
    [],
    async (err, rows: any[]) => {
      if (err || !rows || rows.length === 0) {
        return;
      }

      for (const row of rows) {
        try {
          const config = JSON.parse(row.config || '{}');
          const runId = `run-${Math.random().toString(36).substr(2, 9)}`;

          // Create run row in DB
          db.run(
            `INSERT INTO runs (id, workflow_id, version_id, environment, status, started_at)
             VALUES (?, ?, ?, 'production', 'queued', CURRENT_TIMESTAMP)`,
            [runId, row.workflow_id, row.version_id]
          );

          const jobData: ScheduledRunJob = {
            type: 'scheduled_run',
            runId,
            workflowId: row.workflow_id,
            orgId: row.org_id || 'org-default',
            versionId: row.version_id,
            deploymentId: row.deployment_id,
            cronSchedule: config.cron || '* * * * *',
            timestamp: Date.now()
          };

          await workflowQueue.add('ScheduledRunJob', jobData, {
            attempts: 3
          });

          console.log(`[Scheduler] Enqueued scheduled run ${runId} for deployment ${row.deployment_id}`);
        } catch (e: any) {
          console.error(`[Scheduler] Failed to trigger deployment ${row.deployment_id}:`, e);
        }
      }
    }
  );
});

runMigrations().catch(err => console.error('[Scheduler] DB migration failed:', err));
