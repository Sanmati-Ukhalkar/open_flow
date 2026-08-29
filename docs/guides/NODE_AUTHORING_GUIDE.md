# Node-Authoring Guide

This guide walks you through building, testing, and submitting a custom node for OpenFlow. 

OpenFlow uses a standardized, modular node model. This design keeps execution isolated, prevents direct node-to-node calls, and ensures every node behaves predictably by adhering to a strict input/output contract.

---

## 1. The Node Model, Explained

Every node in OpenFlow lives in its own directory under `src/nodes/<node-name>/` (or `src/nodes/community/<node-name>/` for user-contributed nodes) and consists of exactly four files:

1. **`definition.json`**: Declares the node's identity, metadata (UI display name, icon, category), input/output schema, capabilities, and the configuration form fields rendered in the canvas sidebar.
2. **`run.ts`**: The execution logic. It exports an async `run` function: `(input, config, context?) => Promise<output>`.
3. **`README.md`**: Standard documentation specifying what the node does, what inputs it expects, and any required configuration or credentials.
4. **`run.test.ts`**: Unit tests verifying the node's behavior under success and error states using Vitest.

### Core Architectural Rules
- **No Direct Calls**: Nodes never call other nodes directly. The execution engine is responsible for evaluating the workflow graph (DAG), resolving dependencies, and passing outputs of parent nodes as inputs to children.
- **Strict Contracts**: Input and output structures must be flat, predictable JSON objects. Outputs should wrap their actual return data inside a `data` key (e.g., `{ data: { result: "value" } }`).
- **Error Handling**: A node should catch its own failures and throw a structured error containing a clear, plain-language `message` and a specific string `code`. This enables the canvas UI to display actionable error cards.

---

## 2. Full Worked Example: Word Count Node

Let's build a simple **Word Count** node step by step. This node accepts text input, counts the number of words, characters, and sentences, and returns these statistics.

Create a new folder at `src/nodes/community/word-count/`.

### Step A: Define the Node (`definition.json`)
The `definition.json` defines how the node is displayed in the canvas, its configuration options, and the structure of its inputs/outputs.

Write this to `src/nodes/community/word-count/definition.json`:
```json
{
  "id": "word-count",
  "displayName": "Word Count",
  "icon": "FileText",
  "category": "Text Processing",
  "inputSchema": {
    "type": "object",
    "properties": {
      "text": {
        "type": "string",
        "description": "The input text to analyze."
      }
    },
    "required": ["text"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "words": { "type": "number" },
      "characters": { "type": "number" },
      "sentences": { "type": "number" }
    }
  },
  "capabilities": [],
  "configFields": [
    {
      "name": "excludeSpaces",
      "label": "Exclude Spaces from Character Count",
      "type": "boolean",
      "required": false,
      "defaultValue": false
    }
  ]
}
```

### Step B: Implement the Execution Logic (`run.ts`)
The `run` function receives two arguments:
1. `input`: Compiled outputs from upstream parent nodes (mapped by node ID or passed directly).
2. `config`: The values entered by the user in the configuration panel (e.g., `excludeSpaces`).

Write this to `src/nodes/community/word-count/run.ts`:
```typescript
interface WordCountConfig {
  excludeSpaces?: boolean;
}

interface WordCountInput {
  text?: string;
}

interface WordCountOutput {
  data: {
    words: number;
    characters: number;
    sentences: number;
  };
}

export class NodeExecutionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'NodeExecutionError';
    this.code = code;
  }
}

export async function run(
  input: Record<string, any>,
  config: WordCountConfig
): Promise<WordCountOutput> {
  // 1. Extract and validate input
  // Upstream inputs might be nested under property name or passed directly
  const text = input.text || (input.data && input.data.text) || input.text;

  if (typeof text !== 'string') {
    throw new NodeExecutionError(
      'INVALID_INPUT',
      'The text input must be a valid string. Please verify upstream node outputs.'
    );
  }

  try {
    // 2. Perform word and character counting
    const wordsArray = text.trim().split(/\s+/).filter(Boolean);
    const words = wordsArray.length;

    let characters = text.length;
    if (config.excludeSpaces) {
      characters = text.replace(/\s/g, '').length;
    }

    // Simple sentence splitter on punctuation (.!?)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

    // 3. Return structured output wrapped in 'data'
    return {
      data: {
        words,
        characters,
        sentences
      }
    };
  } catch (error: any) {
    throw new NodeExecutionError(
      'PROCESSING_FAILED',
      error.message || 'An error occurred while analyzing the text.'
    );
  }
}
```

### Step C: Write Unit Tests (`run.test.ts`)
Every node must have a unit test file. We use **Vitest** to run unit tests.

Write this to `src/nodes/community/word-count/run.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { run } from './run';

describe('Word Count Node', () => {
  it('should correctly count words, characters, and sentences', async () => {
    const input = { text: 'Hello world! This is a test.' };
    const config = { excludeSpaces: false };

    const result = await run(input, config);

    expect(result.data).toEqual({
      words: 6,
      characters: 28,
      sentences: 2
    });
  });

  it('should exclude spaces from character count if configured', async () => {
    const input = { text: 'Hello world' };
    const config = { excludeSpaces: true };

    const result = await run(input, config);

    expect(result.data.characters).toBe(10); // 'Helloworld' is 10 chars
    expect(result.data.words).toBe(2);
  });

  it('should throw an INVALID_INPUT error if text is missing or invalid', async () => {
    const input = {};
    const config = {};

    await expect(run(input, config)).rejects.toThrow('The text input must be a valid string.');
  });
});
```

### Step D: Document the Node (`README.md`)
Create a short README to document the inputs, configurations, and outputs for other developers.

Write this to `src/nodes/community/word-count/README.md`:
```markdown
# Word Count Node

Analyzes text to provide words, characters, and sentences statistics.

## Inputs
- `text` (string, required): The text content to analyze.

## Configuration
- `excludeSpaces` (boolean, optional): If checked, whitespace characters will not be counted in the character metric. Defaults to `false`.

## Outputs
- `words` (number): Total word count.
- `characters` (number): Total character count.
- `sentences` (number): Total sentence count.
```

---

## 3. Common Patterns

### A. Declaring Credentials and Capabilities
If your node calls an external API, do not hardcode credentials. Declare them in `definition.json` under `capabilities` and retrieve them from the config context.

Example:
```json
// in definition.json
"capabilities": ["network:fetch", "secrets:llm"]
```
In your `run.ts`, OpenFlow passes decrypted credentials inside `config`:
```typescript
const apiKey = (config as any).apiKey || process.env.MY_SERVICE_API_KEY;
```

### B. Multi-Input Nodes
When a node has multiple upstream parents, the execution engine passes their outputs inside the `input` argument keyed by the parent node's ID.

For example, if node `llm-prompt-1` and node `sqlite-storage-2` connect to your node:
```typescript
const promptOutput = input['llm-prompt-1']?.data?.text;
const sqliteOutput = input['sqlite-storage-2']?.data?.rows;
```
Adhere to this pattern when reading inputs for transform or combination nodes.

### C. Cost-Awareness
If your node runs an operation that consumes paid API credits (like LLM generations), return usage metadata so OpenFlow's analytics engine can track running costs:
```typescript
return {
  data: { text: responseText },
  usage: {
    total_tokens: promptTokens + completionTokens
  }
};
```

---

## 4. Submission Checklist

Before submitting your node in a PR:
- [ ] Folder is located in `src/nodes/community/<node-name>/`.
- [ ] `definition.json` is fully configured and outputs conform to schemas.
- [ ] `run.ts` exports an async `run` function throwing structured `NodeExecutionError` errors.
- [ ] `run.test.ts` passes successfully via `npm run test:unit`.
- [ ] External network/API calls are mocked in the test suite.
- [ ] Node contains a `README.md` with clear instructions.

---

## 5. FAQ

### Can my node call an external API?
Yes. Declare the `"network:fetch"` capability in `definition.json` so the runtime allows sandbox network calls. Always use a configuration parameter or credentials database lookup to fetch API keys dynamically.

### How do I test my node without using API keys?
Always mock the API calls in your `run.test.ts`. Use libraries like `vi.mock` in Vitest to intercept API libraries (e.g., `openai`, `fetch`) and return pre-configured test responses.

### Can my node use Python dependencies?
No. OpenFlow executes nodes in a JS/TS runtime. If you need python-like operations, consider calling an external microservice or package compiling to WebAssembly.
