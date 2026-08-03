import { describe, it, expect } from 'vitest';
import { run } from './run';

describe('Webhook Trigger Node', () => {
  it('should return input body and headers', async () => {
    const input = {
      body: { message: 'hello' },
      headers: { 'content-type': 'application/json' },
    };

    const result = await run(input, {});

    expect(result).toEqual({
      data: {
        body: { message: 'hello' },
        headers: { 'content-type': 'application/json' },
      }
    });
  });

  it('should default to empty body and headers if not provided', async () => {
    const result = await run({}, {});

    expect(result).toEqual({
      data: {
        body: {},
        headers: {},
      }
    });
  });
});
