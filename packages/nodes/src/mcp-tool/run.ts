import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { db } from "@open-flow/db";

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

  let transport: StdioClientTransport;
  let toolToCall = config.toolName;

  if (config.toolName.includes(':')) {
    const parts = config.toolName.split(':');
    const serverName = parts[0];
    toolToCall = parts.slice(1).join(':');

    // Query database for the server configuration
    const server: any = await new Promise((resolve) => {
      db.get('SELECT * FROM mcp_servers WHERE name = ?', [serverName], (_err: any, row: any) => {
        resolve(row || null);
      });
    });

    if (!server) {
      throw new NodeExecutionError(
        'MCP_SERVER_NOT_FOUND',
        `MCP server "${serverName}" is not registered.`
      );
    }

    if (server.type === 'stdio') {
      const parsedArgs = JSON.parse(server.args || '[]');
      const parsedEnv = { ...process.env, ...JSON.parse(server.env || '{}') };
      transport = new StdioClientTransport({
        command: server.command,
        args: parsedArgs,
        env: parsedEnv
      });
    } else {
      throw new NodeExecutionError(
        'UNSUPPORTED_MCP_TYPE',
        `Unsupported MCP server type: ${server.type}`
      );
    }
  } else {
    const serverPath = path.resolve(process.cwd(), 'src/server/mcp-server.ts');
    transport = new StdioClientTransport({
      command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
      args: ["tsx", serverPath]
    });
  }

  const client = new Client({
    name: "open-flow-mcp-runner",
    version: "0.1.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
  } catch (connectError: any) {
    try {
      await transport.close();
    } catch {}
    throw new NodeExecutionError(
      'MCP_CONNECTION_ERROR',
      `Failed to connect to the MCP server: ${connectError.message}`
    );
  }

  try {
    // Call the tool
    const result = await client.callTool({
      name: toolToCall,
      arguments: toolArguments
    }) as any;

    // Close transport
    await transport.close();

    // Check if result has content
    if (!result.content || result.content.length === 0) {
      throw new NodeExecutionError(
        'EMPTY_TOOL_RESPONSE',
        `The tool ${toolToCall} returned an empty response.`
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
      error.message || `An error occurred while executing the MCP tool ${toolToCall}.`
    );
  }
}
