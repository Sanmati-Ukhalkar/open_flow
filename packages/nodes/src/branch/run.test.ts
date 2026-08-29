import { describe, it, expect } from 'vitest';
import { run } from './run';

describe('Branch Node', () => {
  it('should take the true edge when condition evaluates to true', async () => {
    const input = { val: 10 };
    const config = { condition: 'input.val > 5' };

    const result = await run(input, config);

    expect(result).toEqual({
      data: {
        takenEdge: 'true',
        result: true,
      }
    });
  });

  it('should take the false edge when condition evaluates to false', async () => {
    const input = { val: 3 };
    const config = { condition: 'input.val > 5' };

    const result = await run(input, config);

    expect(result).toEqual({
      data: {
        takenEdge: 'false',
        result: false,
      }
    });
  });

  it('should throw an error if condition is missing', async () => {
    await expect(run({}, {})).rejects.toThrow('Missing required field: condition');
  });

  it('should throw an error if condition has syntax errors (malformed condition/input)', async () => {
    const input = { val: 10 };
    const config = { condition: 'input.val >>>> 5' };
    await expect(run(input, config)).rejects.toThrow();
  });
});
