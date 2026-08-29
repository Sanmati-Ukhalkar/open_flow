import { OpenAI } from 'openai';

interface LLMPromptConfig {
  promptText: string;
  model: string;
}

interface LLMPromptOutput {
  data: {
    text: string;
  };
}

class NodeExecutionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'NodeExecutionError';
    this.code = code;
  }
}

function templateString(template: string, data: any): string {
  if (!template) return '';
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const keys = path.trim().split('.');
    let value = data;
    for (const key of keys) {
      if (value === undefined || value === null) return '';
      
      let resolvedKey = key;
      if (value[resolvedKey] === undefined) {
        const dashedKey = key.replace(/\s+/g, '-');
        if (value[dashedKey] !== undefined) {
          resolvedKey = dashedKey;
        }
      }

      if (value === data && value[resolvedKey] === undefined && value.input !== undefined) {
        let resolvedInputKey = key;
        if (value.input[resolvedInputKey] === undefined) {
          const dashedKey = key.replace(/\s+/g, '-');
          if (value.input[dashedKey] !== undefined) {
            resolvedInputKey = dashedKey;
          }
        }
        value = value.input[resolvedInputKey];
      } else {
        value = value[resolvedKey];
      }
    }
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    }
    return '';
  });
}

export async function run(
  input: Record<string, any>,
  config: LLMPromptConfig
): Promise<LLMPromptOutput> {
  const model = config.model || 'groq/compound';
  const isGroqModel = !model.startsWith('gpt-4');

  let apiKey: string | undefined;
  let baseURL: string | undefined;

  if (isGroqModel) {
    apiKey = (config as any).apiKey || process.env.GROQ_API_KEY;
    baseURL = 'https://api.groq.com/openai/v1';

    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      throw new NodeExecutionError(
        'MISSING_GROQ_API_KEY',
        'Groq API Key is missing or not configured. Please set GROQ_API_KEY in your .env file or Credentials panel.'
      );
    }
  } else {
    apiKey = (config as any).apiKey || process.env.OPENAI_API_KEY;
    baseURL = undefined; // Use default OpenAI base URL

    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      throw new NodeExecutionError(
        'MISSING_OPENAI_API_KEY',
        'OpenAI API Key is missing or not configured. Please set OPENAI_API_KEY in your .env file or Credentials panel.'
      );
    }
  }

  if (!config.promptText) {
    throw new NodeExecutionError(
      'MISSING_PROMPT',
      'Prompt text is required. Please fill in the prompt field in the configuration panel.'
    );
  }

  const finalPromptText = templateString(config.promptText, { input });
  console.log("-----------------------------------------");
  console.log("FINAL PROMPT SENT TO LLM:\n", finalPromptText);
  console.log("INPUT DATA RECEIVED IN LLM:\n", JSON.stringify(input, null, 2));
  console.log("-----------------------------------------");

  try {
    const openai = new OpenAI({ apiKey, baseURL });
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'user', content: finalPromptText }
      ],
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content;
    if (text === null || text === undefined) {
      throw new NodeExecutionError(
        'EMPTY_RESPONSE',
        'Received an empty response from the API.'
      );
    }

    return {
      data: { text }
    };
  } catch (error: any) {
    if (error instanceof NodeExecutionError) {
      throw error;
    }

    // Handle API-specific errors
    if (error.status === 401) {
      throw new NodeExecutionError(
        'INVALID_API_KEY',
        `The provided API Key is invalid. Please check your credentials for ${isGroqModel ? 'Groq' : 'OpenAI'} in the .env file.`
      );
    }

    if (error.status === 429) {
      throw new NodeExecutionError(
        'RATE_LIMIT_EXCEEDED',
        'API rate limit exceeded or quota exhausted. Please try again later.'
      );
    }

    throw new NodeExecutionError(
      'API_EXECUTION_ERROR',
      error.message || `An error occurred while calling the ${isGroqModel ? 'Groq' : 'OpenAI'} API.`
    );
  }
}
