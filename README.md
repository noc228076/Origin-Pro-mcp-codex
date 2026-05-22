# originpro-mcp

中文 | [English](#english)

适用于 Codex 的 OriginPro MCP 服务。

## Codex 配置

把下面配置加入 `~/.codex/config.toml`，或加入某个工作区内的 `.codex/config.toml`：

```toml
[mcp_servers.originpro]
command = "originpro-mcp"
args = []
startup_timeout_sec = 30
tool_timeout_sec = 120

[mcp_servers.originpro.env]
ORIGIN_MCP_WORKDIR = "."
```

如果你是在源码目录里开发，而不是使用已安装的 `originpro-mcp` 命令，可以使用：

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

## 说明

- 该 MCP 服务面向 OriginLab OriginPro。
- 使用 stdio transport。
- 所有文件工具只接受相对路径。

<details>
<summary id="english">English</summary>

# originpro-mcp

OriginPro MCP server for Codex.

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

</details>
