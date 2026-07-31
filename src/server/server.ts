import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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

// Helper to validate node outputs against definition schemas
function validateOutputSchema(nodeType: string, output: any): { isValid: boolean; warning?: string } {
  try {
    const definitionPath = path.resolve(process.cwd(), `src/nodes/${nodeType}/definition.json`);
    if (!fs.existsSync(definitionPath)) {
      return { isValid: true };
    }
    
    const definition = JSON.parse(fs.readFileSync(definitionPath, 'utf8'));
    const schema = definition.outputSchema;
    if (!schema) {
      return { isValid: true };
    }

    if (schema.type === 'object') {
      const dataToValidate = output.data !== undefined ? output.data : output;
      if (typeof dataToValidate !== 'object' || dataToValidate === null) {
        return { 
          isValid: false, 
          warning: `Output payload type is not an object. Expected: ${schema.type}.` 
        };
      }

      if (schema.properties) {
        for (const key of Object.keys(schema.properties)) {
          const propSchema = schema.properties[key];
          const val = dataToValidate[key];
          
          if (val === undefined) {
            continue; 
          }

          const valType = typeof val;
          if (propSchema.type === 'string' && valType !== 'string') {
            return { isValid: false, warning: `Property '${key}' type is '${valType}'. Expected: 'string'.` };
          }
          if (propSchema.type === 'number' && valType !== 'number') {
            return { isValid: false, warning: `Property '${key}' type is '${valType}'. Expected: 'number'.` };
          }
          if (propSchema.type === 'boolean' && valType !== 'boolean') {
            return { isValid: false, warning: `Property '${key}' type is '${valType}'. Expected: 'boolean'.` };
          }
          if (propSchema.type === 'object' && valType !== 'object') {
            return { isValid: false, warning: `Property '${key}' type is '${valType}'. Expected: 'object'.` };
          }
        }
      }
    }
    return { isValid: true };
  } catch (error: any) {
    console.error("Schema validation skipped due to internal error:", error);
    return { isValid: true }; 
  }
}

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
    let output: any;
    if (nodeType === 'llm-prompt') {
      output = await runLLMPrompt(input || {}, config || {});
    } else if (nodeType === 'mcp-tool') {
      output = await runMCPTool(input || {}, config || {});
    } else if (nodeType === 'http-webhook') {
      output = await runHTTPWebhook(input || {}, config || {});
    } else if (nodeType === 'sqlite-storage') {
      output = await runSQLiteStorage(input || {}, config || {});
    } else if (nodeType === 'text-transform') {
      output = await runTextTransform(input || {}, config || {});
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_NODE_TYPE',
          message: `Unsupported node type: ${nodeType}`
        }
      });
    }

    // Run output schema validation checks
    const validation = validateOutputSchema(nodeType, output);
    if (!validation.isValid) {
      return res.json({ success: true, output, warning: validation.warning });
    }

    return res.json({ success: true, output });
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
