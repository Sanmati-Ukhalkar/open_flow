export async function up(db: any) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS organization_members (
      org_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (org_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      org_id TEXT,
      nodes TEXT NOT NULL,
      edges TEXT NOT NULL,
      description TEXT,
      category TEXT,
      required_credentials TEXT,
      is_template BOOLEAN DEFAULT FALSE,
      thumbnail_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      nodes TEXT NOT NULL,
      edges TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      version_id TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'production',
      status TEXT NOT NULL DEFAULT 'active',
      org_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS triggers (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      deployment_id TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT NOT NULL,
      org_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      encrypted_data TEXT NOT NULL,
      iv TEXT NOT NULL,
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      version_id TEXT,
      environment TEXT NOT NULL DEFAULT 'development',
      status TEXT NOT NULL,
      duration_ms INTEGER DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      error TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS run_node_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      node_type TEXT NOT NULL,
      status TEXT NOT NULL,
      input TEXT,
      output TEXT,
      error TEXT,
      cost_cents REAL DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      metadata_json TEXT,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_org_provider ON credentials(org_id, provider)`
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
