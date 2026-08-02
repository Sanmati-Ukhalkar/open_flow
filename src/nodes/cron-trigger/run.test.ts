import { describe, it, expect } from 'vitest';
import { run } from './run';

describe('Cron Trigger Node', () => {
  it('should return trigger timestamp and cron expression', async () => {
    const config = { cronExpression: '*/10 * * * *' };
    const result = await run({}, config);

    expect(result.cronPattern).toBe('*/10 * * * *');
    expect(result.triggeredAt).toBeDefined();
  });
});
