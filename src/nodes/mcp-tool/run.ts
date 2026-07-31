import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

interface MCPToolConfig {
  toolName: string;
  inputParamName: string;
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
  config: MCPToolConfig
): Promise<{ data: any }> {
  if (!config.toolName) {
    throw new NodeExecutionError(
      'MISSING_TOOL_NAME',
      'No MCP tool was selected. Please select a tool in the configuration panel.'
    );
  }

  // Determine the input value from upstream node output
  let rawValue = '';
  if (input !== null && input !== undefined) {
    // Resolve the standard NodeOutput shape: { data: ... }
    const actualData = input.data !== undefined ? input.data : input;
    if (typeof actualData === 'string') {
      rawValue = actualData;
    } else if (typeof actualData === 'object') {
      rawValue = actualData.text !== undefined ? String(actualData.text) : JSON.stringify(actualData);
    } else {
      rawValue = String(actualData);
    }
  }

  const paramName = config.inputParamName || 'text';
  const toolArguments = {
    [paramName]: rawValue
  };

  const serverPath = path.resolve(process.cwd(), 'src/server/mcp-server.ts');
  const transport = new StdioClientTransport({
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ["tsx", serverPath]
  });

  const client = new Client({
    name: "open-flow-mcp-runner",
    version: "0.1.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    
    // Call the tool
    const result = await client.callTool({
      name: config.toolName,
      arguments: toolArguments
    }) as any;

    // Close transport
    await transport.close();

    // Check if result has content
    if (!result.content || result.content.length === 0) {
      throw new NodeExecutionError(
        'EMPTY_TOOL_RESPONSE',
        `The tool ${config.toolName} returned an empty response.`
      );
    }

    const firstContent = result.content[0];
    if (firstContent.type !== 'text') {
      throw new NodeExecutionError(
        'UNSUPPORTED_CONTENT_TYPE',
        `The tool returned unsupported content type: ${firstContent.type}`
      );
    }

    // Try to parse text content as JSON if possible, otherwise return as string
    let dataPayload = firstContent.text;
    try {
      dataPayload = JSON.parse(firstContent.text);
    } catch {
      // Return as raw string
    }

    return { data: dataPayload };
  } catch (error: any) {
    // Ensure transport is closed
    try {
      await transport.close();
    } catch {}

    if (error instanceof NodeExecutionError) {
      throw error;
    }

    throw new NodeExecutionError(
      'MCP_EXECUTION_ERROR',
      error.message || `An error occurred while executing the MCP tool ${config.toolName}.`
    );
  }
}
