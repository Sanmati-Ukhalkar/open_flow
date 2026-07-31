import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'metadata.sqlite');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite metadata database:', err.message);
  } else {
    console.log('Connected to SQLite metadata database.');
  }
});

// Setup db schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, provider)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      graph_json TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS run_node_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      status TEXT NOT NULL,
      output_json TEXT,
      error_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workflow_versions (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      graph_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      workflow_version_id TEXT NOT NULL,
      bearer_token TEXT NOT NULL,
      status TEXT NOT NULL,
      request_count INTEGER DEFAULT 0,
      last_called_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
      FOREIGN KEY (workflow_version_id) REFERENCES workflow_versions(id) ON DELETE CASCADE,
      UNIQUE(workflow_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS triggers (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL,
      config_json TEXT NOT NULL,
      last_triggered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
      UNIQUE(workflow_id, trigger_type)
    )
  `);

  // v0.10 Template schema migration
  const columnsToAdd = [
    { name: 'is_template', definition: 'BOOLEAN DEFAULT FALSE' },
    { name: 'description', definition: 'TEXT' },
    { name: 'category', definition: 'TEXT' },
    { name: 'required_credentials', definition: 'TEXT' },
    { name: 'thumbnail_url', definition: 'TEXT' }
  ];

  db.all("PRAGMA table_info(workflows)", (err, rows: any[]) => {
    if (err) {
      console.error('Failed to check workflows schema:', err.message);
      return;
    }
    const existingColumns = rows.map(r => r.name);
    
    columnsToAdd.forEach(col => {
      if (!existingColumns.includes(col.name)) {
        db.run(`ALTER TABLE workflows ADD COLUMN ${col.name} ${col.definition}`, (alterErr) => {
          if (alterErr) {
            console.error(`Failed to add column ${col.name}:`, alterErr.message);
          } else {
            console.log(`Added column ${col.name} to workflows table.`);
          }
        });
      }
    });
  });
});
