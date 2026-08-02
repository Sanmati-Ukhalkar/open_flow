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
});
