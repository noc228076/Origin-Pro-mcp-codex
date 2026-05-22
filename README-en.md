# originpro-mcp

[中文](README.md) | English

OriginPro MCP server for Codex. It uses stdio transport to automate OriginLab OriginPro.

## Prerequisites

- Windows.
- OriginLab OriginPro installed and registered as a COM Automation Server.
- Node.js 20 or later.
- Codex installed and able to read `~/.codex/config.toml`.

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

Add this to `~/.codex/config.toml` or `.codex/config.toml` in your workspace:

```toml
[mcp_servers.originpro]
command = "originpro-mcp"
args = []
startup_timeout_sec = 30
tool_timeout_sec = 120

[mcp_servers.originpro.env]
ORIGIN_MCP_WORKDIR = "."
```

If you do not use the global command and want to run from source, use:

```toml
[mcp_servers.originpro]
command = "node"
args = ["dist/index.js"]
cwd = "<PATH_TO_THIS_REPO>"
startup_timeout_sec = 30
tool_timeout_sec = 120

[mcp_servers.originpro.env]
ORIGIN_MCP_WORKDIR = "."
```

Restart Codex after changing the configuration.

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
- `origin_export_graph`
