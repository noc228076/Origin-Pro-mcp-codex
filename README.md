# originpro-mcp

OriginPro MCP server for Codex.

## Codex configuration

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

If you are developing from source instead of using the installed command, use:

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

## Notes

- This MCP is for OriginLab OriginPro.
- It uses stdio transport.
- All file tools only accept relative paths.