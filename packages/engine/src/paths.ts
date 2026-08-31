import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveNodeFile(...segments: string[]): string {
  const relPath = path.resolve(__dirname, '../../nodes/src', ...segments);
  if (fs.existsSync(relPath)) return relPath;
  const cwdPath = path.resolve(process.cwd(), 'packages/nodes/src', ...segments);
  if (fs.existsSync(cwdPath)) return cwdPath;
  return relPath;
}

export function resolveEngineFile(...segments: string[]): string {
  const relPath = path.resolve(__dirname, ...segments);
  if (fs.existsSync(relPath)) return relPath;
  const cwdPath = path.resolve(process.cwd(), 'packages/engine/src', ...segments);
  if (fs.existsSync(cwdPath)) return cwdPath;
  return relPath;
}
