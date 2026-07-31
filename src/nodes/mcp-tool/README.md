# MCP Tool Node

This node executes a tool exposed by an MCP Server.

## Configuration

- `toolName`: The name of the tool to execute.
- `inputParamName`: The parameter name on the tool to map the incoming connection data to.

## Execution

Connects dynamically via standard input/output (stdio) to a local MCP server script, queries tools, maps inputs, and returns the result.
