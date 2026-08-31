import dotenv from 'dotenv';
import cron from 'node-cron';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { db, runMigrations, logger } from '@open-flow/db';
import { ScheduledRunJob } from '@open-flow/shared-types';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null
});

const workflowQueue = new Queue('workflow-runs', {
  connection: redisConnection
});

logger.info({ service: 'scheduler' }, 'Scheduler service starting up...');

// Run ticker every minute to check active deployments with cron triggers
cron.schedule('* * * * *', async () => {
  logger.debug({ service: 'scheduler' }, 'Checking scheduled workflow deployments...');
  
  db.all(
    `SELECT d.id as deployment_id, d.workflow_id, d.org_id, d.workflow_version_id as version_id, t.config_json as config
     FROM deployments d
     JOIN triggers t ON d.workflow_id = t.workflow_id
     WHERE d.status = 'active' 
       AND (t.trigger_type = 'cron' OR t.trigger_type = 'cron-trigger') 
       AND t.status = 'active'`,
    [],
    async (err, rows: any[]) => {
      if (err) {
        logger.error({ service: 'scheduler', error: err.message }, 'Error querying active scheduled deployments');
        return;
      }
      if (!rows || rows.length === 0) {
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

          logger.info({ service: 'scheduler', runId, deploymentId: row.deployment_id, workflowId: row.workflow_id }, 'Enqueued scheduled run');
        } catch (e: any) {
          logger.error({ service: 'scheduler', deploymentId: row.deployment_id, error: e.message || e }, 'Failed to trigger deployment');
        }
      }
    }
  );
});

runMigrations().catch(err => logger.error({ service: 'scheduler', error: err.message || err }, 'DB migration failed'));
