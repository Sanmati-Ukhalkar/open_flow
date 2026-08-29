interface HTTPWebhookConfig {
  url: string;
  bodyTemplate: string;
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
  input: any,
  config: HTTPWebhookConfig
): Promise<{ data: any }> {
  if (!config.url) {
    throw new NodeExecutionError(
      'MISSING_URL',
      'Webhook URL is required. Please fill in the Webhook URL field in the configuration panel.'
    );
  }

  // Resolve upstream input text
  let resolvedInputText = '';
  if (input !== null && input !== undefined) {
    const actualData = input.data !== undefined ? input.data : input;
    if (typeof actualData === 'string') {
      resolvedInputText = actualData;
    } else if (typeof actualData === 'object') {
      resolvedInputText = actualData.text !== undefined ? String(actualData.text) : JSON.stringify(actualData);
    } else {
      resolvedInputText = String(actualData);
    }
  }

  // Simple placeholder replacement for JSON template (safely escaping quotes/newlines)
  const escapedInput = resolvedInputText
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
    
  const bodyText = (config.bodyTemplate || '{\n  "text": "{{input}}"\n}')
    .replace(/\{\{input\}\}/g, escapedInput);

  // Validate JSON body
  try {
    JSON.parse(bodyText);
  } catch (e: any) {
    throw new NodeExecutionError(
      'INVALID_JSON_BODY',
      `The resolved body template is not valid JSON: ${e.message}. Please verify the template syntax.`
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: bodyText,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseText = await response.text();

    if (!response.ok) {
      throw new NodeExecutionError(
        'HTTP_ERROR',
        `Webhook request failed with status ${response.status}: ${responseText}`
      );
    }

    let parsedResponse: any = responseText;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {}

    return { data: parsedResponse };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error instanceof NodeExecutionError) {
      throw error;
    }
    if (error.name === 'AbortError') {
      throw new NodeExecutionError(
        'TIMEOUT_ERROR',
        'The Webhook request timed out after 10 seconds.'
      );
    }
    throw new NodeExecutionError(
      'FETCH_ERROR',
      error.message || 'An error occurred while sending the HTTP Webhook request.'
    );
  }
}
