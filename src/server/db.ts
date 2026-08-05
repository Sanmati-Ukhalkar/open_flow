import sqlite3 from 'sqlite3';
import path from 'path';
import { Pool } from 'pg';

export function translateToPostgres(sql: string, values: any[] = []): { query: string; values: any[] } {
  let query = sql;
  const newValues = [...values];

  // 1. Replace '?' placeholders with '$1', '$2', ...
  let index = 1;
  query = query.replace(/\?/g, () => `$${index++}`);

  // 2. Handle 'INSERT OR IGNORE INTO' -> 'INSERT INTO ... ON CONFLICT DO NOTHING'
  if (query.match(/INSERT\s+OR\s+IGNORE\s+INTO/i)) {
    query = query.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, 'INSERT INTO');
    if (!query.includes('ON CONFLICT')) {
      query += ' ON CONFLICT DO NOTHING';
    }
  }

  // 3. Handle 'INTEGER PRIMARY KEY AUTOINCREMENT' -> 'SERIAL PRIMARY KEY'
  query = query.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');

  // 4. Handle sqlite_master -> information_schema
  if (query.includes('sqlite_master')) {
    query = query.replace(
      /SELECT\s+name\s+FROM\s+sqlite_master\s+WHERE\s+type='table'\s+AND\s+name\s+NOT\s+LIKE\s+'sqlite_%'\s+ORDER\s+BY\s+name/i,
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public' AND table_name NOT LIKE 'sqlite_%' ORDER BY table_name"
    );
  }

  // 5. Convert table_info PRAGMA check:
  // PRAGMA table_info(tableName)
  const pragmaMatch = query.match(/PRAGMA\s+table_info\((\w+)\)/i);
  if (pragmaMatch) {
    const tableName = pragmaMatch[1];
    query = `SELECT column_name AS name FROM information_schema.columns WHERE table_name = '${tableName}'`;
  }

  // 6. Handle BOOLEAN DEFAULT values (0 -> false, 1 -> true)
  query = query.replace(/BOOLEAN\s+DEFAULT\s+0/gi, 'BOOLEAN DEFAULT FALSE');
  query = query.replace(/BOOLEAN\s+DEFAULT\s+1/gi, 'BOOLEAN DEFAULT TRUE');

  // 7. Handle DATETIME type -> TIMESTAMP
  query = query.replace(/\bDATETIME\b/gi, 'TIMESTAMP');

  // 8. If this is an INSERT statement, return id for serial id matching
  if (query.trim().toUpperCase().startsWith('INSERT') && !query.includes('RETURNING')) {
    if (!query.match(/INTO\s+organization_members/i)) {
      query += ' RETURNING id';
    }
  }

  return { query, values: newValues };
}

export class DatabaseWrapper {
  public isPg: boolean;
  private pool: Pool | null = null;
  private sqliteDb: sqlite3.Database | null = null;

  constructor(connectionString: string | undefined, sqlitePath: string) {
    if (connectionString) {
      this.isPg = true;
      this.pool = new Pool({ connectionString });
      console.log(`Connected to PostgreSQL database.`);
    } else {
      this.isPg = false;
      this.sqliteDb = new sqlite3.Database(sqlitePath, (err) => {
        if (err) {
          console.error(`Failed to connect to SQLite at ${sqlitePath}:`, err.message);
        } else {
          console.log(`Connected to SQLite database.`);
        }
      });
    }
  }

  serialize(callback: () => void) {
    callback();
  }

  run(sql: string, params: any[] | any = [], callback?: (this: any, err: Error | null) => void) {
    let actualParams = params;
    let actualCallback = callback;
    if (typeof params === 'function') {
      actualCallback = params;
      actualParams = [];
    } else if (params === undefined || params === null) {
      actualParams = [];
    }

    if (this.isPg) {
      const { query, values } = translateToPostgres(sql, actualParams);
      this.pool!.query(query, values)
        .then((res) => {
          if (actualCallback) {
            const lastID = res.rows[0]?.id || null;
            actualCallback.call({ lastID, changes: res.rowCount || 0 }, null);
          }
        })
        .catch((err) => {
          if (actualCallback) actualCallback.call({ lastID: null, changes: 0 }, err);
        });
    } else {
      this.sqliteDb!.run(sql, actualParams, actualCallback);
    }
  }

  get(sql: string, params: any[] | any = [], callback?: (err: Error | null, row: any) => void) {
    let actualParams = params;
    let actualCallback = callback;
    if (typeof params === 'function') {
      actualCallback = params;
      actualParams = [];
    } else if (params === undefined || params === null) {
      actualParams = [];
    }

    if (this.isPg) {
      const { query, values } = translateToPostgres(sql, actualParams);
      this.pool!.query(query, values)
        .then((res) => {
          if (actualCallback) actualCallback(null, res.rows[0]);
        })
        .catch((err) => {
          if (actualCallback) actualCallback(err, null);
        });
    } else {
      this.sqliteDb!.get(sql, actualParams, actualCallback);
    }
  }

  all(sql: string, params: any[] | any = [], callback?: (err: Error | null, rows: any[]) => void) {
    let actualParams = params;
    let actualCallback = callback;
    if (typeof params === 'function') {
      actualCallback = params;
      actualParams = [];
    } else if (params === undefined || params === null) {
      actualParams = [];
    }

    if (this.isPg) {
      const { query, values } = translateToPostgres(sql, actualParams);
      this.pool!.query(query, values)
        .then((res) => {
          if (actualCallback) actualCallback(null, res.rows);
        })
        .catch((err) => {
          if (actualCallback) actualCallback(err, []);
        });
    } else {
      this.sqliteDb!.all(sql, actualParams, actualCallback);
    }
  }

  prepare(sql: string) {
    return {
      run: (...args: any[]) => {
        let callback: ((err: any) => void) | undefined;
        let params = args;
        if (typeof args[args.length - 1] === 'function') {
          callback = args[args.length - 1];
          params = args.slice(0, args.length - 1);
        }
        this.run(sql, params, callback);
      },
      finalize: (callback?: () => void) => {
        if (callback) callback();
      }
    };
  }

  close(callback?: (err: any) => void) {
    if (this.isPg) {
      this.pool!.end().then(() => callback && callback(null)).catch(err => callback && callback(err));
    } else {
      this.sqliteDb!.close(callback);
    }
  }
}

const dbPath = path.resolve(process.cwd(), 'metadata.sqlite');
export const db = new DatabaseWrapper(process.env.DATABASE_URL, dbPath);

// Setup db schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      org_id TEXT,
      provider TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, provider)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workflows (
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
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER DEFAULT 0,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      finished_at TIMESTAMP,
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
      cost_cents REAL DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      metadata_json TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workflow_versions (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      graph_json TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
      last_called_at TIMESTAMP,
      org_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
      last_triggered_at TIMESTAMP,
      org_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
      UNIQUE(workflow_id, trigger_type)
    )
  `);

  // v0.11 Organizations schema migration
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS organization_members (
      org_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE(org_id, email)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      command TEXT,
      args TEXT,
      env TEXT,
      url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // v0.13 Observability schema migration
  db.run(`
    CREATE TABLE IF NOT EXISTS deployment_alerts (
      id TEXT PRIMARY KEY,
      deployment_id TEXT NOT NULL,
      error_threshold_percent REAL NOT NULL,
      window_runs INTEGER NOT NULL DEFAULT 10,
      webhook_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE,
      UNIQUE(deployment_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS aggregated_metrics (
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
    )
  `);

  const v11ColumnsToAdd = [
    { table: 'workflows', name: 'org_id', definition: 'TEXT' },
    { table: 'credentials', name: 'org_id', definition: 'TEXT' },
    { table: 'deployments', name: 'org_id', definition: 'TEXT' },
    { table: 'triggers', name: 'org_id', definition: 'TEXT' }
  ];

  db.run("SELECT 1", () => {
    v11ColumnsToAdd.forEach(({ table, name, definition }) => {
      db.all(`PRAGMA table_info(${table})`, (err: any, rows: any[]) => {
        if (err) return;
        const existingColumns = rows.map(r => r.name);
        if (!existingColumns.includes(name)) {
          db.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`, (alterErr: any) => {
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

    const v13ColumnsToAdd = [
      { table: 'workflows', name: 'description', definition: 'TEXT' },
      { table: 'workflows', name: 'category', definition: 'TEXT' },
      { table: 'workflows', name: 'required_credentials', definition: 'TEXT' },
      { table: 'workflows', name: 'is_template', definition: 'BOOLEAN DEFAULT FALSE' },
      { table: 'workflows', name: 'thumbnail_url', definition: 'TEXT' },
      { table: 'run_node_results', name: 'cost_cents', definition: 'REAL DEFAULT 0' },
      { table: 'run_node_results', name: 'duration_ms', definition: 'INTEGER DEFAULT 0' },
      { table: 'run_node_results', name: 'metadata_json', definition: 'TEXT' },
      { table: 'runs', name: 'duration_ms', definition: 'INTEGER DEFAULT 0' }
    ];

    v13ColumnsToAdd.forEach(({ table, name, definition }) => {
      db.all(`PRAGMA table_info(${table})`, (err: any, rows: any[]) => {
        if (err) return;
        if (!rows.map(r => r.name).includes(name)) {
          db.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`, (alterErr: any) => {
            if (!alterErr) console.log(`Added column ${name} to ${table} table.`);
          });
        }
      });
    });
  });

  function runV11Migration() {
    // For every user, ensure they have a Personal org
    db.all('SELECT id, email FROM users', [], (err: any, users: any[]) => {
      if (err || !users) return;
      
      users.forEach(user => {
        db.get("SELECT org_id FROM organization_members WHERE user_id = ? AND role = 'owner' LIMIT 1", [user.id], (_err: any, row: any) => {
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

  // Create unique index on credentials(org_id, provider) to support upsert/ON CONFLICT
  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_org_provider 
    ON credentials(org_id, provider)
  `);
});
