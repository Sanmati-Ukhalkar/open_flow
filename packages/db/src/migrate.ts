import path from 'path';
import { db } from './db';
import * as migration1 from './migrations/001_initial_schema';
import * as migration2 from './migrations/002_add_queue_job_id';

export async function runMigrations() {
  console.log('[DB] Running database migrations...');
  try {
    await migration1.up(db);
    await migration2.up(db);
    console.log('[DB] Database migrations applied successfully.');
  } catch (error: any) {
    console.error('[DB] Error executing database migrations:', error);
    throw error;
  }
}

const isCLI = process.argv[1] && (
  process.argv[1].endsWith('migrate.ts') ||
  process.argv[1].endsWith('migrate.js') ||
  path.basename(process.argv[1]).includes('migrate')
);

if (isCLI) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[DB] Migration failed fatally:', err.message || err);
      process.exit(1);
    });
}
