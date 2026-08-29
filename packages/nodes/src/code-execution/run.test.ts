import { describe, it, expect } from 'vitest';
import { run } from './run';

describe('Code Execution Node', () => {
  it('should run custom Javascript and return the result', async () => {
    const input = { a: 5, b: 6 };
    const config = { code: 'return input.a + input.b;' };

    const result = await run(input, config);

    expect(result).toBe(11);
  });

  it('should throw an error if code is missing', async () => {
    await expect(run({}, {})).rejects.toThrow('Missing required field: code');
  });

  it('should catch runtime evaluation errors', async () => {
    const config = { code: 'return input.nonExistent.something;' };
    await expect(run({}, config)).rejects.toThrow();
  });
});
