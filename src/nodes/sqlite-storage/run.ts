import sqlite3 from 'sqlite3';
import path from 'path';

interface SQLiteStorageConfig {
  tableName: string;
  columnName: string;
}

class NodeExecutionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'NodeExecutionError';
    this.code = code;
  }
}

export async function run(
  input: any,
  config: SQLiteStorageConfig
): Promise<{ data: { success: boolean; rowId: number } }> {
  const tableName = config.tableName || 'workflow_data';
  const columnName = config.columnName || 'payload';

  // Sanitize identifiers to prevent SQL injection on table/column names
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new NodeExecutionError(
      'INVALID_TABLE_NAME',
      'Table name must contain only alphanumeric characters and underscores, and start with a letter.'
    );
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName)) {
    throw new NodeExecutionError(
      'INVALID_COLUMN_NAME',
      'Column name must contain only alphanumeric characters and underscores, and start with a letter.'
    );
  }

  // Resolve input data payload
  let dataToStore = '';
  if (input !== null && input !== undefined) {
    const actualData = input.data !== undefined ? input.data : input;
    dataToStore = typeof actualData === 'object' ? JSON.stringify(actualData) : String(actualData);
  }

  const dbPath = path.resolve(process.cwd(), 'database.sqlite');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        return reject(new NodeExecutionError('DB_OPEN_ERROR', `Failed to open SQLite database: ${err.message}`));
      }
    });

    db.serialize(() => {
      // Create table if not exists
      db.run(
        `CREATE TABLE IF NOT EXISTS ${tableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          ${columnName} TEXT
        )`,
        (err) => {
          if (err) {
            db.close();
            return reject(new NodeExecutionError('CREATE_TABLE_ERROR', `Failed to create database table: ${err.message}`));
          }
        }
      );

      // Insert record
      db.run(
        `INSERT INTO ${tableName} (${columnName}) VALUES (?)`,
        [dataToStore],
        function (err) {
          db.close();
          if (err) {
            return reject(new NodeExecutionError('INSERT_ROW_ERROR', `Failed to insert record: ${err.message}`));
          }
          
          resolve({
            data: {
              success: true,
              rowId: this.lastID,
            },
          });
        }
      );
    });
  });
}
