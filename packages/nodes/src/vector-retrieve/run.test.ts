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
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockImplementation(() => {
        // Return dummy database with 1 pre-existing vector
        return JSON.stringify([
          {
            id: 'vec-1',
            text: 'apple fruit',
            metadata: { category: 'fruit' },
            embedding: [1.0, 0.0, 0.0],
          },
        ]);
      }),
    },
  };
});

describe('Vector Retrieve Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'mock-key';
  });

  it('should embed query and retrieve sorted similarity results', async () => {
    // Mock query embedding [1.0, 0.0, 0.0] - perfect match with vec-1
    mockCreate.mockResolvedValue({
      data: [{ embedding: [1.0, 0.0, 0.0] }],
    });

    const config = {
      query: 'apple',
      topK: 1,
    };

    const result = await run({}, config);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].text).toBe('apple fruit');
    expect(result.results[0].score).toBeCloseTo(1.0);
  });

  it('should throw an error if query is missing', async () => {
    await expect(run({}, { query: '' })).rejects.toThrow('Missing required field: query');
  });
});
