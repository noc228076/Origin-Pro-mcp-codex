#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createOriginProMcpServer } from "./server.js";

async function main() {
  const server = createOriginProMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OriginPro MCP server running on stdio.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
