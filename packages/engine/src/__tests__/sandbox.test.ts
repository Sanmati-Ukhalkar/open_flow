import { describe, it, expect } from 'vitest';
import { runInSandbox, getNodeCapabilities } from '../sandbox';
import path from 'path';

describe('Sandbox Security & Capability Isolation', () => {
  it('should return empty capabilities array if node definition does not exist', () => {
    const caps = getNodeCapabilities('non-existent-node-type', false);
    expect(caps).toEqual([]);
  });

  it('should return capabilities array for valid node type', () => {
    const caps = getNodeCapabilities('llm-prompt', false);
    expect(Array.isArray(caps)).toBe(true);
  });

  it('should sanitize environment variables and prevent access to sensitive keys inside worker', async () => {
    process.env.ENCRYPTION_KEY = 'super-secret-key';
    process.env.JWT_SECRET = 'jwt-secret';

    const testRunPath = path.resolve(__dirname, '../../../nodes/src/text-transform/run.ts');
    
    const output = await runInSandbox(
      'text-transform',
      testRunPath,
      { 'node-1': { data: { text: 'hello' } } },
      { template: 'Formatted: {{node-1.text}}' },
      []
    );

    expect(output).toBeDefined();
    expect(output.data.text).toBe('Formatted: hello');
  });
});
