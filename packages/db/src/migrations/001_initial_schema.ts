export async function up(db: any) {
  const statements = [
    // 1. Users Table
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 2. Organizations Table
    `CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 3. Organization Members
    `CREATE TABLE IF NOT EXISTS organization_members (
      org_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (org_id, user_id),
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // 4. Invitations
    `CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE(org_id, email)
    )`,

    // 5. Credentials
    `CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      org_id TEXT,
      provider TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(org_id, provider)
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_org_provider ON credentials(org_id, provider)`,

    // 6. Workflows
    `CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      required_credentials TEXT,
      is_template BOOLEAN DEFAULT FALSE,
      thumbnail_url TEXT,
      graph_json TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      org_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // 7. Workflow Versions
    `CREATE TABLE IF NOT EXISTS workflow_versions (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      graph_json TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    )`,

    // 8. Deployments
    `CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      workflow_version_id TEXT NOT NULL,
      bearer_token TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      request_count INTEGER DEFAULT 0,
      last_called_at TIMESTAMP,
      org_id TEXT,
      environment TEXT NOT NULL DEFAULT 'production',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
      FOREIGN KEY (workflow_version_id) REFERENCES workflow_versions(id) ON DELETE CASCADE,
      UNIQUE(workflow_id)
    )`,

    // 9. Triggers
    `CREATE TABLE IF NOT EXISTS triggers (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      deployment_id TEXT,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      config_json TEXT NOT NULL,
      last_triggered_at TIMESTAMP,
      org_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
      UNIQUE(workflow_id, trigger_type)
    )`,

    // 10. Runs
    `CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      version_id TEXT,
      environment TEXT NOT NULL DEFAULT 'development',
      status TEXT NOT NULL,
      duration_ms INTEGER DEFAULT 0,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      finished_at TIMESTAMP,
      completed_at TIMESTAMP,
      error TEXT,
      queue_job_id TEXT,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    )`,

    // 11. Run Node Results
    `CREATE TABLE IF NOT EXISTS run_node_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      node_type TEXT,
      status TEXT NOT NULL,
      output_json TEXT,
      error_json TEXT,
      cost_cents REAL DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      metadata_json TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
    )`,

    // 12. MCP Servers
    `CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      command TEXT,
      args TEXT,
      env TEXT,
      url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 13. Deployment Alerts
    `CREATE TABLE IF NOT EXISTS deployment_alerts (
      id TEXT PRIMARY KEY,
      deployment_id TEXT NOT NULL,
      error_threshold_percent REAL NOT NULL,
      window_runs INTEGER NOT NULL DEFAULT 10,
      webhook_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE,
      UNIQUE(deployment_id)
    )`,

    // 14. Aggregated Metrics
    `CREATE TABLE IF NOT EXISTS aggregated_metrics (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      workflow_id TEXT,
      deployment_id TEXT,
      date TEXT NOT NULL,
      total_runs INTEGER DEFAULT 0,
      total_errors INTEGER DEFAULT 0,
      total_cost_cents REAL DEFAULT 0,
      total_duration_ms INTEGER DEFAULT 0,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE(org_id, workflow_id, deployment_id, date)
    )`
  ];

  for (const sql of statements) {
    await new Promise<void>((resolve, reject) => {
      db.run(sql, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
