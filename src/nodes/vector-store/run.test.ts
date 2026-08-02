import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from './run';

const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    OpenAI: class {
      embeddings = {
        create: mockCreate,
      };
    },
  };
});

vi.mock('fs', () => {
  return {
    default: {
      existsSync: vi.fn().mockReturnValue(false),
      readFileSync: vi.fn().mockReturnValue('[]'),
      writeFileSync: vi.fn(),
    },
  };
});

describe('Vector Store Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'mock-key';
  });

  it('should call OpenAI embeddings API and return a vector ID', async () => {
    mockCreate.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
    });

    const config = {
      text: 'hello world',
      metadata: '{"source": "test"}',
    };

    const result = await run({}, config);

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'hello world',
    });
  });

  it('should throw an error if text is missing', async () => {
    await expect(run({}, { text: '' })).rejects.toThrow('Missing required field: text to embed');
  });
});
