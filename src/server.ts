import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OriginService, VisibleState } from "./originService.js";
import { toolInputSchemas } from "./toolSchemas.js";
import { ToolResult } from "./types.js";

function toolResult<T extends object>(structuredContent: T): ToolResult<T> {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(structuredContent, null, 2)
      }
    ],
    structuredContent
  };
}

export function createOriginProMcpServer(service = new OriginService()): McpServer {
  const server = new McpServer({
    name: "originpro-mcp",
    version: "0.1.0"
  });

  server.registerTool(
    "origin_status",
    {
      title: "OriginPro Status",
      description: "Report whether the MCP bridge is running and whether OriginPro is connected.",
      inputSchema: toolInputSchemas.origin_status
    },
    async () => toolResult(await service.status())
  );

  server.registerTool(
    "origin_connect",
    {
      title: "Connect OriginPro",
      description: "Attach to an existing OriginPro COM session or start a new one.",
      inputSchema: toolInputSchemas.origin_connect
    },
    async ({ visibleState }) => toolResult(await service.connect(visibleState as VisibleState | undefined))
  );

  server.registerTool(
    "origin_set_visible",
    {
      title: "Set OriginPro Visibility",
      description: "Set the OriginPro main window visibility state.",
      inputSchema: toolInputSchemas.origin_set_visible
    },
    async ({ state }) => toolResult(await service.setVisible(state as VisibleState))
  );

  server.registerTool(
    "origin_new_project",
    {
      title: "New OriginPro Project",
      description: "Create a new OriginPro project in the active session.",
      inputSchema: toolInputSchemas.origin_new_project
    },
    async () => toolResult(await service.newProject())
  );

  server.registerTool(
    "origin_load_project",
    {
      title: "Load OriginPro Project",
      description: "Load an OriginPro project from a workspace-relative path.",
      inputSchema: toolInputSchemas.origin_load_project
    },
    async ({ relativePath }) => toolResult(await service.loadProject(relativePath))
  );

  server.registerTool(
    "origin_save_project",
    {
      title: "Save OriginPro Project",
      description: "Save the active OriginPro project to a workspace-relative path.",
      inputSchema: toolInputSchemas.origin_save_project
    },
    async ({ relativePath }) => toolResult(await service.saveProject(relativePath))
  );

  server.registerTool(
    "origin_run",
    {
      title: "Run OriginPro",
      description: "Let OriginPro process pending automation commands.",
      inputSchema: toolInputSchemas.origin_run
    },
    async () => toolResult(await service.run())
  );

  server.registerTool(
    "origin_exit",
    {
      title: "Exit OriginPro",
      description: "Exit the attached OriginPro session and stop the bridge process.",
      inputSchema: toolInputSchemas.origin_exit
    },
    async () => toolResult(await service.exit())
  );

  server.registerTool(
    "origin_create_page",
    {
      title: "Create OriginPro Page",
      description: "Create a worksheet, matrix, graph, layout, or notes page.",
      inputSchema: toolInputSchemas.origin_create_page
    },
    async ({ pageType, name, template }) => {
      const defaultTemplate = template ?? (pageType === "worksheet" ? "Origin" : undefined);
      return toolResult(await service.createPage(pageType, name, defaultTemplate));
    }
  );

  server.registerTool(
    "origin_put_worksheet",
    {
      title: "Write OriginPro Worksheet",
      description: "Write a rectangular JSON matrix into an OriginPro worksheet range.",
      inputSchema: toolInputSchemas.origin_put_worksheet
    },
    async ({ worksheetRange, data, rowOffset, columnOffset }) =>
      toolResult(await service.putWorksheet(worksheetRange, data, rowOffset, columnOffset))
  );

  server.registerTool(
    "origin_get_worksheet",
    {
      title: "Read OriginPro Worksheet",
      description: "Read worksheet data from an OriginPro worksheet range.",
      inputSchema: toolInputSchemas.origin_get_worksheet
    },
    async ({ worksheetRange }) => toolResult(await service.getWorksheet(worksheetRange))
  );

  server.registerTool(
    "origin_execute_labtalk",
    {
      title: "Execute LabTalk",
      description: "Execute a LabTalk script in OriginPro.",
      inputSchema: toolInputSchemas.origin_execute_labtalk
    },
    async ({ script, context }) => toolResult(await service.executeLabTalk(script, context))
  );

  server.registerTool(
    "origin_get_ltvar",
    {
      title: "Get LabTalk Variable",
      description: "Read a numeric LabTalk variable through OriginPro COM.",
      inputSchema: toolInputSchemas.origin_get_ltvar
    },
    async ({ name }) => toolResult(await service.getLtVar(name))
  );

  server.registerTool(
    "origin_set_ltvar",
    {
      title: "Set LabTalk Variable",
      description: "Set a numeric LabTalk variable through OriginPro COM.",
      inputSchema: toolInputSchemas.origin_set_ltvar
    },
    async ({ name, value }) => toolResult(await service.setLtVar(name, value))
  );

  server.registerTool(
    "origin_get_ltstr",
    {
      title: "Get LabTalk String",
      description: "Read a LabTalk string variable through OriginPro COM.",
      inputSchema: toolInputSchemas.origin_get_ltstr
    },
    async ({ name }) => toolResult(await service.getLtStr(name))
  );

  server.registerTool(
    "origin_set_ltstr",
    {
      title: "Set LabTalk String",
      description: "Set a LabTalk string variable through OriginPro COM.",
      inputSchema: toolInputSchemas.origin_set_ltstr
    },
    async ({ name, value }) => toolResult(await service.setLtStr(name, value))
  );

  server.registerTool(
    "origin_plot_xy",
    {
      title: "Plot XY Data",
      description: "Create an OriginPro XY plot from a worksheet range.",
      inputSchema: toolInputSchemas.origin_plot_xy
    },
    async ({ worksheetRange, xColumn, yColumns, plotType, graphName, templateName }) =>
      toolResult(
        await service.plotXY(worksheetRange, xColumn, yColumns, plotType, graphName, templateName)
      )
  );

  server.registerTool(
    "origin_export_graph",
    {
      title: "Export OriginPro Graph",
      description: "Export the active or named OriginPro graph to a workspace-relative path.",
      inputSchema: toolInputSchemas.origin_export_graph
    },
    async ({ relativePath, format, graphName }) =>
      toolResult(await service.exportGraph(relativePath, format, graphName))
  );

  return server;
}
