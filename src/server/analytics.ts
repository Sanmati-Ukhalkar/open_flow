import express from 'express';
import { db } from './db';

export const analyticsRouter = express.Router();

const dbAll = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// GET /api/analytics/cost
// Roll up costs per workflow for the active organization
analyticsRouter.get('/cost', async (req: any, res: any) => {
  const orgId = req.orgId;
  if (!orgId) return res.status(401).json({ error: 'Organization ID required' });

  try {
    const costData = await dbAll(`
      SELECT 
        w.id as workflowId, 
        w.name as workflowName,
        SUM(rnr.cost_cents) as totalCostCents
      FROM workflows w
      LEFT JOIN runs r ON r.workflow_id = w.id
      LEFT JOIN run_node_results rnr ON rnr.run_id = r.id
      WHERE w.org_id = ?
      GROUP BY w.id
      ORDER BY totalCostCents DESC
    `, [orgId]);

    res.json(costData);
  } catch (error) {
    console.error('Error fetching cost analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/errors
// Retrieve success/failure rates and common failing nodes
analyticsRouter.get('/errors', async (req: any, res: any) => {
  const orgId = req.orgId;
  if (!orgId) return res.status(401).json({ error: 'Organization ID required' });

  try {
    const errorStats = await dbAll(`
      SELECT 
        rnr.node_id as nodeId,
        COUNT(rnr.id) as errorCount
      FROM run_node_results rnr
      JOIN runs r ON rnr.run_id = r.id
      JOIN workflows w ON r.workflow_id = w.id
      WHERE w.org_id = ? AND rnr.status = 'error'
      GROUP BY rnr.node_id
      ORDER BY errorCount DESC
      LIMIT 10
    `, [orgId]);

    const runStats = await dbAll(`
      SELECT 
        status,
        COUNT(id) as count
      FROM runs
      WHERE workflow_id IN (SELECT id FROM workflows WHERE org_id = ?)
      GROUP BY status
    `, [orgId]);

    res.json({ errorStats, runStats });
  } catch (error) {
    console.error('Error fetching error analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/usage
// Fetch total runs and active deployments
analyticsRouter.get('/usage', async (req: any, res: any) => {
  const orgId = req.orgId;
  if (!orgId) return res.status(401).json({ error: 'Organization ID required' });

  try {
    const usageData = await dbAll(`
      SELECT 
        DATE(started_at) as date,
        COUNT(id) as runCount
      FROM runs
      WHERE workflow_id IN (SELECT id FROM workflows WHERE org_id = ?)
      GROUP BY DATE(started_at)
      ORDER BY DATE(started_at) DESC
      LIMIT 30
    `, [orgId]);

    res.json(usageData);
  } catch (error) {
    console.error('Error fetching usage analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/analytics/deployment/:deploymentId/alert
// Set an alert for a deployment
analyticsRouter.post('/deployment/:deploymentId/alert', async (req: any, res: any) => {
  const orgId = req.orgId;
  const { deploymentId } = req.params;
  const { errorThresholdPercent, windowRuns, webhookUrl } = req.body;

  if (!orgId || !deploymentId || errorThresholdPercent === undefined || !webhookUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const alertId = `alert-${Math.random().toString(36).substr(2, 9)}`;
    
    // UPSERT basically
    await dbRun('DELETE FROM deployment_alerts WHERE deployment_id = ?', [deploymentId]);
    await dbRun(
      'INSERT INTO deployment_alerts (id, deployment_id, error_threshold_percent, window_runs, webhook_url) VALUES (?, ?, ?, ?, ?)',
      [alertId, deploymentId, errorThresholdPercent, windowRuns || 10, webhookUrl]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting deployment alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/deployment/:deploymentId/alert
// Get alert for a deployment
analyticsRouter.get('/deployment/:deploymentId/alert', async (req: any, res: any) => {
  const orgId = req.orgId;
  const { deploymentId } = req.params;

  if (!orgId || !deploymentId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const alert = await dbAll('SELECT * FROM deployment_alerts WHERE deployment_id = ? LIMIT 1', [deploymentId]);
    if (alert.length === 0) {
      return res.json(null);
    }
    res.json(alert[0]);
  } catch (error) {
    console.error('Error getting deployment alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Periodic Cleanup (90 days retention)
setInterval(async () => {
  console.log('Running 90-day retention cleanup for raw execution logs...');
  try {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Delete raw logs older than 90 days
    await dbRun(`
      DELETE FROM run_node_results 
      WHERE run_id IN (SELECT id FROM runs WHERE started_at < ?)
    `, [cutoffDate]);

    await dbRun(`
      DELETE FROM runs WHERE started_at < ?
    `, [cutoffDate]);
    
    console.log('Retention cleanup complete.');
  } catch (e) {
    console.error('Retention cleanup failed:', e);
  }
}, 24 * 60 * 60 * 1000); // Daily
