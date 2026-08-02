import { describe, it, expect } from 'vitest';
import { run } from './run';

describe('Loop Node', () => {
  it('should return input results directly', async () => {
    const input = { results: [1, 2, 3] };
    const result = await run(input, {});

    expect(result).toEqual({
      results: [1, 2, 3],
    });
  });

  it('should return empty results if not provided in input', async () => {
    const result = await run({}, {});

    expect(result).toEqual({
      results: [],
    });
  });
});
