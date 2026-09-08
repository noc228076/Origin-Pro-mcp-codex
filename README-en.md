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

Use the JSON below in Codex MCP configuration. This example assumes the repository is located at `D:\Documents\origin-pro-mcp-codex`; replace that path with your actual repository directory if needed.

```json
{
  "type": "stdio",
  "command": "node",
  "args": [
    "D:\\Documents\\origin-pro-mcp-codex\\dist\\index.js"
  ],
  "env": {
    "ORIGIN_MCP_WORKDIR": "D:\\Documents\\origin-pro-mcp-codex"
  }
}
```

Restart Codex after changing the configuration.

## CCSwitch Configuration

If you run the server directly from this source directory, use the JSON below in CCSwitch. This example assumes the repository is located at `D:\Documents\origin-pro-mcp-codex`; replace that path with your actual repository directory if needed.

```json
{
  "type": "stdio",
  "command": "node",
  "args": [
    "D:\\Documents\\origin-pro-mcp-codex\\dist\\index.js"
  ],
  "env": {
    "ORIGIN_MCP_WORKDIR": "D:\\Documents\\origin-pro-mcp-codex"
  }
}
```

## Path & Environment Configuration

### Path Support
- `ORIGIN_MCP_WORKDIR`: Specifies the workspace root for Origin project files, data worksheets, and exported figures (defaults to current working directory).
- Supports both **relative paths** (relative to the workspace directory) and Windows **absolute paths** (e.g. `D:\Desktop\project.opju`).
- When relative paths are used, `..` path traversal is rejected for workspace isolation.

### Optional Environment Variables
- `ORIGIN_MCP_WORKDIR`: Workspace root path.
- `ORIGIN_MCP_TIMEOUT_MS`: Timeout for each Origin COM request in milliseconds (default: `30000`).
- `ORIGIN_MCP_POWERSHELL_PATH`: Custom path to PowerShell executable (defaults to auto-detecting `pwsh`, falling back to `powershell.exe`).
- `ORIGIN_MCP_ALLOW_ABSOLUTE_PATHS`: Enable/disable absolute path resolution (default: `true`).

## Key Features & Optimizations

- **Native COM Array Fast-Path**: `origin_put_worksheet` and `origin_get_worksheet` use 2D COM SafeArray transfers, achieving over 50x faster data exchange.
- **Non-Interactive Batch Mode**: Injects `@N=1; @V=1;` to suppress modal dialogs and UI flicker during automation.
- **PowerShell 7 Auto-Detection & Guard**: Automatically discovers `pwsh` with configurable timeout safeguards.

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
