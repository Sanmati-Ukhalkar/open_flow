import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from './run';

const mockConnect = vi.fn();
const mockCallTool = vi.fn();
const mockClose = vi.fn();

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => {
  return {
    Client: class {
      connect = mockConnect;
      callTool = mockCallTool;
    },
  };
});

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => {
  return {
    StdioClientTransport: class {
      close = mockClose;
    },
  };
});

describe('MCP Tool Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call connect, callTool, close, and parse output successfully', async () => {
    mockCallTool.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: true, count: 5 }),
        },
      ],
    });

    const config = {
      toolName: 'my-mcp-tool',
      inputParamName: 'queryText',
    };

    const input = { text: 'test query' };

    const result = await run(input, config);

    expect(result).toEqual({
      data: { success: true, count: 5 },
    });

    expect(mockConnect).toHaveBeenCalled();
    expect(mockCallTool).toHaveBeenCalledWith({
      name: 'my-mcp-tool',
      arguments: { queryText: 'test query' },
    });
    expect(mockClose).toHaveBeenCalled();
  });

  it('should throw an error if toolName is missing', async () => {
    const config = {
      toolName: '',
      inputParamName: 'text',
    };

    await expect(run({}, config)).rejects.toThrow('No MCP tool was selected');
  });

  it('should throw MCP_CONNECTION_ERROR if client fails to connect', async () => {
    mockConnect.mockRejectedValue(new Error('Connection refused'));

    const config = {
      toolName: 'my-mcp-tool',
      inputParamName: 'queryText',
    };

    await expect(run({}, config)).rejects.toThrow('Failed to connect to the MCP server');
  });

  it('should handle malformed JSON text response as raw string', async () => {
    mockConnect.mockResolvedValue(undefined);
    mockCallTool.mockResolvedValue({
      content: [{ type: 'text', text: 'not-json-at-all' }],
    });

    const config = { toolName: 'my-mcp-tool', inputParamName: 'text' };
    const result = await run({ text: 'hi' }, config);

    // Non-JSON text returned as-is in data
    expect(result).toEqual({ data: 'not-json-at-all' });
  });

  it('should throw MCP_EXECUTION_ERROR if callTool rejects', async () => {
    mockConnect.mockResolvedValue(undefined);
    mockCallTool.mockRejectedValue(new Error('Tool execution exploded'));

    const config = { toolName: 'my-mcp-tool', inputParamName: 'text' };

    await expect(run({ text: 'hi' }, config)).rejects.toThrow('Tool execution exploded');
  });
});
