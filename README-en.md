# originpro-mcp

[中文](README.md) | English

OriginPro MCP server for Codex. It uses stdio transport to automate OriginLab OriginPro.

## Prerequisites

- Windows.
- OriginLab OriginPro installed and registered as a COM Automation Server.
- Node.js 20 or later.
- Codex installed and able to configure MCP servers.

## Deployment

Install the server from GitHub as a global command:

```powershell
npm install -g github:noc228076/origin-pro-mcp-codex#codex/publish-originpro-mcp
```

Verify that the command is available:

```powershell
originpro-mcp
```

If you are developing from source:

```powershell
npm install
npm run build
npm link
```

`npm link` registers the current source package as the global `originpro-mcp` command so Codex can start it directly.

## Startup

For normal use, you do not need to start the service manually. Codex starts `originpro-mcp` from the MCP configuration.

To verify that the service can start manually, run:

```powershell
originpro-mcp
```

For source debugging, you can also run:

```powershell
npm start
```

On Windows, you can also double-click:

```text
start-originpro-mcp.cmd
```

## Codex Configuration

Use the JSON below in Codex MCP configuration. This example uses a local source path, so update `args` and `ORIGIN_MCP_WORKDIR` if the project is moved.

```json
{
  "type": "stdio",
  "command": "node",
  "args": [
    "D:\\Documents\\New project\\dist\\index.js"
  ],
  "env": {
    "ORIGIN_MCP_WORKDIR": "D:\\Documents\\New project"
  }
}
```

Restart Codex after changing the configuration.

## CCSwitch Configuration

If you run the server directly from this source directory, use the JSON below in CCSwitch. This example uses a local machine path, so update `args` and `ORIGIN_MCP_WORKDIR` if the project is moved.

```json
{
  "type": "stdio",
  "command": "node",
  "args": [
    "D:\\Documents\\New project\\dist\\index.js"
  ],
  "env": {
    "ORIGIN_MCP_WORKDIR": "D:\\Documents\\New project"
  }
}
```

## Paths

- `ORIGIN_MCP_WORKDIR` is the workspace root for Origin project files, exported figures, and other file tools.
- All file tools only accept relative paths.
- Absolute paths and `..` traversal paths are rejected.

## Notes

- This MCP is for OriginLab OriginPro.
- It uses stdio transport.
- Codex manages the MCP server process automatically.

## MCP Tools

- `origin_status`
- `origin_connect`
- `origin_set_visible`
- `origin_new_project`
- `origin_load_project`
- `origin_save_project`
- `origin_run`
- `origin_exit`
- `origin_create_page`
- `origin_put_worksheet`
- `origin_get_worksheet`
- `origin_execute_labtalk`
- `origin_get_ltvar`
- `origin_set_ltvar`
- `origin_get_ltstr`
- `origin_set_ltstr`
- `origin_plot_xy`
- `origin_set_plot_style`
- `origin_set_axis_style`
- `origin_apply_graph_theme`
- `origin_create_combo_chart`
- `origin_create_publication_figure`
- `origin_export_graph`

## Recommended Flow

1. `origin_connect`
2. `origin_create_publication_figure`
3. `origin_export_graph`
4. `origin_save_project`

Prefer these higher-level tools over raw LabTalk unless a case is not covered yet.
