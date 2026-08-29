import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from './run';

// Mock OpenAI SDK
const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    OpenAI: class {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

describe('LLM Prompt Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'mock-openai-key';
    process.env.GROQ_API_KEY = 'mock-groq-key';
  });

  it('should successfully query OpenAI API', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Hello response from LLM',
          },
        },
      ],
    });

    const config = {
      promptText: 'Say hello',
      model: 'gpt-4o-mini',
    };

    const result = await run({}, config);

    expect(result).toEqual({
      data: {
        text: 'Hello response from LLM',
      },
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say hello' }],
      })
    );
  });

  it('should resolve prompt templates using upstream connection inputs', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Template response',
          },
        },
      ],
    });

    const config = {
      promptText: 'Hello {{input.userName}}, your score is {{input.score}}',
      model: 'gpt-4o-mini',
    };

    const mockInput = {
      userName: 'Alice',
      score: 95,
    };

    const result = await run(mockInput, config);

    expect(result).toEqual({
      data: {
        text: 'Template response',
      },
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello Alice, your score is 95' }],
      })
    );
  });

  it('should throw an error if promptText is missing', async () => {
    const config = {
      promptText: '',
      model: 'gpt-4o-mini',
    };

    await expect(run({}, config)).rejects.toThrow('Prompt text is required');
  });

  it('should handle OpenAI API 401 invalid key error', async () => {
    const mockError: any = new Error('Unauthorized API key');
    mockError.status = 401;
    mockCreate.mockRejectedValue(mockError);

    const config = {
      promptText: 'Say hello',
      model: 'gpt-4o-mini',
    };

    await expect(run({}, config)).rejects.toThrow('The provided API Key is invalid');
  });

  it('should handle OpenAI API 429 rate limit error', async () => {
    const mockError: any = new Error('Rate limited');
    mockError.status = 429;
    mockCreate.mockRejectedValue(mockError);

    const config = {
      promptText: 'Say hello',
      model: 'gpt-4o-mini',
    };

    await expect(run({}, config)).rejects.toThrow('API rate limit exceeded');
  });
});
