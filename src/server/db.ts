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

  // v0.11 Organizations schema migration
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS organization_members (
      org_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (org_id, user_id),
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE(org_id, email)
    )
  `);

  const v11ColumnsToAdd = [
    { table: 'workflows', name: 'org_id', definition: 'TEXT' },
    { table: 'credentials', name: 'org_id', definition: 'TEXT' },
    { table: 'deployments', name: 'org_id', definition: 'TEXT' },
    { table: 'triggers', name: 'org_id', definition: 'TEXT' }
  ];

  v11ColumnsToAdd.forEach(({ table, name, definition }) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows: any[]) => {
      if (err) return;
      const existingColumns = rows.map(r => r.name);
      if (!existingColumns.includes(name)) {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`, (alterErr) => {
          if (!alterErr) {
            console.log(`Added column ${name} to ${table} table.`);
            
            // If it's workflows, run the v0.11 auto-migration after adding the column
            if (table === 'workflows') {
              runV11Migration();
            }
          }
        });
      } else if (table === 'workflows') {
        // If the column already exists, still run the migration in case there's unmigrated data
        runV11Migration();
      }
    });
  });

  function runV11Migration() {
    // For every user, ensure they have a Personal org
    db.all('SELECT id, email FROM users', [], (err, users: any[]) => {
      if (err || !users) return;
      
      users.forEach(user => {
        db.get('SELECT org_id FROM organization_members WHERE user_id = ? AND role = "owner" LIMIT 1', [user.id], (_err, row: any) => {
          if (!row) {
            const orgId = `org-${Math.random().toString(36).substr(2, 9)}`;
            db.run('INSERT INTO organizations (id, name) VALUES (?, ?)', [orgId, 'Personal'], () => {
              db.run('INSERT INTO organization_members (org_id, user_id, role) VALUES (?, ?, ?)', [orgId, user.id, 'owner'], () => {
                // Migrate resources
                migrateResources(user.id, orgId);
              });
            });
          } else {
            // Re-run migration for safety just in case
            migrateResources(user.id, row.org_id);
          }
        });
      });
    });
  }

  function migrateResources(userId: string, orgId: string) {
    db.run('UPDATE workflows SET org_id = ? WHERE owner_id = ? AND org_id IS NULL', [orgId, userId]);
    db.run('UPDATE credentials SET org_id = ? WHERE user_id = ? AND org_id IS NULL', [orgId, userId]);
    // Deployments and triggers can be joined to workflows to find their owner for migration
    db.run(`
      UPDATE deployments SET org_id = ? 
      WHERE org_id IS NULL AND workflow_id IN (SELECT id FROM workflows WHERE owner_id = ?)
    `, [orgId, userId]);
    db.run(`
      UPDATE triggers SET org_id = ? 
      WHERE org_id IS NULL AND workflow_id IN (SELECT id FROM workflows WHERE owner_id = ?)
    `, [orgId, userId]);
  }
});
