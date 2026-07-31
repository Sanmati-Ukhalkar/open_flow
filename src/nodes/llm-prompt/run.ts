import { OpenAI } from 'openai';

interface LLMPromptConfig {
  promptText: string;
  model: string;
}

interface LLMPromptOutput {
  text: string;
}

class NodeExecutionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'NodeExecutionError';
    this.code = code;
  }
}

export async function run(
  _input: Record<string, any>,
  config: LLMPromptConfig
): Promise<LLMPromptOutput> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new NodeExecutionError(
      'MISSING_API_KEY',
      'OpenAI API Key is missing or not configured. Please create a .env file and set OPENAI_API_KEY to your actual key.'
    );
  }

  if (!config.promptText) {
    throw new NodeExecutionError(
      'MISSING_PROMPT',
      'Prompt text is required. Please fill in the prompt field in the configuration panel.'
    );
  }

  const model = config.model || 'gpt-4o-mini';

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'user', content: config.promptText }
      ],
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content;
    if (text === null || text === undefined) {
      throw new NodeExecutionError(
        'EMPTY_RESPONSE',
        'Received an empty response from the OpenAI API.'
      );
    }

    return { text };
  } catch (error: any) {
    if (error instanceof NodeExecutionError) {
      throw error;
    }

    // Handle OpenAI specific API errors
    if (error.status === 401) {
      throw new NodeExecutionError(
        'INVALID_API_KEY',
        'The provided OpenAI API Key is invalid. Please check your credentials in the .env file.'
      );
    }

    if (error.status === 429) {
      throw new NodeExecutionError(
        'RATE_LIMIT_EXCEEDED',
        'OpenAI API rate limit exceeded or quota exhausted. Please check your billing details or try again later.'
      );
    }

    throw new NodeExecutionError(
      'OPENAI_API_ERROR',
      error.message || 'An error occurred while calling the OpenAI API.'
    );
  }
}
