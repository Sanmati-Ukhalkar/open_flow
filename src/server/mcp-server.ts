import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "open-flow-local-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "text_analyzer",
        description: "Analyze the provided text. Returns word count, character count, and uppercase version.",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The text to analyze",
            },
          },
          required: ["text"],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "text_analyzer") {
    throw new Error(`Tool not found: ${request.params.name}`);
  }

  const text = String(request.params.arguments?.text || "");
  const charCount = text.length;
  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const uppercaseText = text.toUpperCase();

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          wordCount,
          characterCount: charCount,
          uppercaseText,
        }),
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Local MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main:", error);
  process.exit(1);
});
