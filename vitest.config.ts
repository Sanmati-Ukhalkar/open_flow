import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/**/*.test.ts', 'packages/**/*.test.ts', 'apps/**/*.spec.ts', 'packages/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'tests'],
    fileParallelism: false,
    alias: {
      '@open-flow/shared-types': path.resolve(__dirname, './packages/shared-types/src/index.ts'),
      '@open-flow/db': path.resolve(__dirname, './packages/db/src/index.ts'),
      '@open-flow/nodes': path.resolve(__dirname, './packages/nodes/src/index.ts'),
      '@open-flow/engine': path.resolve(__dirname, './packages/engine/src/index.ts')
    }
  },
});
