interface TextTransformConfig {
  template: string;
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
  input: Record<string, any>,
  config: TextTransformConfig
): Promise<{ data: { text: string } }> {
  if (!config.template) {
    throw new NodeExecutionError(
      'MISSING_TEMPLATE',
      'Template text is required. Please fill in the template field in the configuration panel.'
    );
  }

  let resultText = config.template;

  // Regex to match {{node-id}} or {{node-id.property}}
  const placeholderRegex = /\{\{([a-zA-Z0-9_\-]+)(?:\.([a-zA-Z0-9_\-]+))?\}\}/g;

  resultText = resultText.replace(placeholderRegex, (_match, nodeId, property) => {
    // Look up the parent node output in the input map
    const parentOutput = input[nodeId];

    if (!parentOutput) {
      return '';
    }

    const dataPayload = parentOutput.data;
    if (dataPayload === undefined || dataPayload === null) {
      return '';
    }

    // Resolve property path if specified, e.g. {{llm-node-1.text}}
    if (property) {
      if (typeof dataPayload === 'object' && dataPayload[property] !== undefined) {
        const val = dataPayload[property];
        return typeof val === 'object' ? JSON.stringify(val) : String(val);
      }
      return '';
    }

    // No property path: return text field if object, or standard string representation
    if (typeof dataPayload === 'object') {
      if (dataPayload.text !== undefined) {
        return String(dataPayload.text);
      }
      return JSON.stringify(dataPayload);
    }

    return String(dataPayload);
  });

  return {
    data: {
      text: resultText
    }
  };
}
