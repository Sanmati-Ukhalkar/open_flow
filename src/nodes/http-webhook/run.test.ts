import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from './run';

describe('HTTP Webhook Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully make fetch POST request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const input = { text: 'test payload' };
    const config = {
      url: 'https://example.com/api',
      bodyTemplate: '{"payload": "{{input}}"}',
    };

    const result = await run(input, config);

    expect(result).toEqual({
      data: { success: true },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        method: 'POST',
        body: '{"payload": "test payload"}',
      })
    );
  });

  it('should throw an error on bad status code response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });
    vi.stubGlobal('fetch', mockFetch);

    const config = {
      url: 'https://example.com/api',
      bodyTemplate: '{"payload": "{{input}}"}',
    };

    await expect(run({ text: 'test' }, config)).rejects.toThrow('Webhook request failed with status 500');
  });

  it('should throw an error if URL is missing', async () => {
    await expect(run({}, { url: '', bodyTemplate: '' })).rejects.toThrow('Webhook URL is required');
  });
});
