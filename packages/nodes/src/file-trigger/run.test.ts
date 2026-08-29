import { describe, it, expect } from 'vitest';
import { run } from './run';

describe('File Trigger Node', () => {
  it('should parse and return input file details', async () => {
    const input = {
      filePath: '/path/to/file.txt',
      fileName: 'file.txt',
      eventType: 'created',
    };

    const result = await run(input, {});

    expect(result).toEqual({
      filePath: '/path/to/file.txt',
      fileName: 'file.txt',
      eventType: 'created',
    });
  });
});
