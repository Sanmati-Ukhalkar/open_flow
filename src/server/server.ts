import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { run as runLLMPrompt } from '../nodes/llm-prompt/run';
import { run as runMCPTool } from '../nodes/mcp-tool/run';
import { run as runHTTPWebhook } from '../nodes/http-webhook/run';
import { run as runSQLiteStorage } from '../nodes/sqlite-storage/run';
import { run as runTextTransform } from '../nodes/text-transform/run';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// GET API to retrieve tools from the local stdio MCP server
app.get('/api/mcp/tools', async (_req, res) => {
  const serverPath = path.resolve(process.cwd(), 'src/server/mcp-server.ts');
  const transport = new StdioClientTransport({
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ["tsx", serverPath]
  });

  const client = new Client({
    name: "open-flow-express-client",
    version: "0.1.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    const toolsResult = await client.listTools();
    await transport.close();
    
    return res.json({ success: true, tools: toolsResult.tools });
  } catch (error: any) {
    console.error("Error listing MCP tools:", error);
    try {
      await transport.close();
    } catch {}
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST API to run a specific node
app.post('/api/run-node', async (req, res) => {
  const { nodeType, config, input } = req.body;

  try {
    if (nodeType === 'llm-prompt') {
      const output = await runLLMPrompt(input || {}, config || {});
      return res.json({ success: true, output });
    } else if (nodeType === 'mcp-tool') {
      const output = await runMCPTool(input || {}, config || {});
      return res.json({ success: true, output });
    } else if (nodeType === 'http-webhook') {
      const output = await runHTTPWebhook(input || {}, config || {});
      return res.json({ success: true, output });
    } else if (nodeType === 'sqlite-storage') {
      const output = await runSQLiteStorage(input || {}, config || {});
      return res.json({ success: true, output });
    } else if (nodeType === 'text-transform') {
      const output = await runTextTransform(input || {}, config || {});
      return res.json({ success: true, output });
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_NODE_TYPE',
          message: `Unsupported node type: ${nodeType}`
        }
      });
    }
  } catch (error: any) {
    console.error(`Error executing node type ${nodeType}:`, error);
    return res.status(500).json({
      success: false,
      error: {
        code: error.code || 'EXECUTION_ERROR',
        message: error.message || 'An unknown error occurred during execution.'
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
