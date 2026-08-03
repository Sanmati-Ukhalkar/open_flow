import { describe, it, expect } from 'vitest';
import { run } from './run';

describe('Text Transform Node', () => {
  it('should interpolate single parent nodes correctly', async () => {
    const input = {
      'node-1': {
        data: {
          text: 'World',
        },
      },
    };

    const config = {
      template: 'Hello {{node-1}}!',
    };

    const result = await run(input, config);

    expect(result).toEqual({
      data: {
        text: 'Hello World!',
      },
    });
  });

  it('should interpolate multiple parent nodes and properties', async () => {
    const input = {
      'llm-node': {
        data: {
          text: 'AI response',
          usage: { tokens: 100 },
        },
      },
      'webhook-node': {
        data: {
          customerName: 'Alice',
        },
      },
    };

    const config = {
      template: 'Hello {{webhook-node.customerName}}, here is the result: {{llm-node.text}}',
    };

    const result = await run(input, config);

    expect(result).toEqual({
      data: {
        text: 'Hello Alice, here is the result: AI response',
      },
    });
  });

  it('should return empty string for missing placeholder keys', async () => {
    const input = {};
    const config = {
      template: 'Hello {{non-existent}}!',
    };

    const result = await run(input, config);

    expect(result).toEqual({
      data: {
        text: 'Hello !',
      },
    });
  });

  it('should throw an error if template is missing', async () => {
    const config = {
      template: '',
    };

    await expect(run({}, config)).rejects.toThrow('Template text is required');
  });

  it('should handle partial upstream input (one missing parent collapses to empty string)', async () => {
    // Two parents connected; one output is missing (upstream skipped)
    const input = {
      'node-a': { data: { text: 'present' } },
      // 'node-b' is absent (simulates upstream skip)
    };
    const config = { template: '{{node-a}} + {{node-b}}' };

    const result = await run(input, config);

    // Missing reference resolves to '' — documented behavior, not error
    expect(result).toEqual({ data: { text: 'present + ' } });
  });
});
