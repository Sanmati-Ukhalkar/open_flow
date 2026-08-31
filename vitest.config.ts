import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/**/*.test.ts', 'packages/**/*.test.ts', 'apps/**/*.spec.ts', 'packages/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'tests'],
    fileParallelism: false,
    env: {
      JWT_SECRET: 'test-jwt-secret-key-12345678901234567890',
      ENCRYPTION_KEY: 'test-encryption-key-12345678901234567890',
      REDIS_URL: 'redis://127.0.0.1:6380'
    },
    alias: {
      '@open-flow/shared-types': path.resolve(__dirname, './packages/shared-types/src/index.ts'),
      '@open-flow/db': path.resolve(__dirname, './packages/db/src/index.ts'),
      '@open-flow/nodes': path.resolve(__dirname, './packages/nodes/src/index.ts'),
      '@open-flow/engine': path.resolve(__dirname, './packages/engine/src/index.ts')
    }
  },
});
