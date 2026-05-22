# originpro-mcp

中文 | [English](README-en.md)

适用于 Codex 的 OriginPro MCP 服务，通过 stdio transport 调用 OriginLab OriginPro。

## 前置条件

- Windows。
- 已安装并注册 OriginLab OriginPro COM Automation Server。
- Node.js 20 或更高版本。
- Codex 已安装并可读取 `~/.codex/config.toml`。

## 部署

推荐从 GitHub 安装为全局命令：

```powershell
npm install -g github:noc228076/origin-pro-mcp-codex#codex/publish-originpro-mcp
```

安装后确认命令可用：

```powershell
originpro-mcp
```

如果你是在源码目录里开发：

```powershell
npm install
npm run build
npm link
```

`npm link` 会把当前源码包注册成全局 `originpro-mcp` 命令，方便 Codex 直接启动。

## 启动

正常使用时不需要手动启动服务，Codex 会按 MCP 配置自动拉起 `originpro-mcp`。

如果只想手动验证服务能启动，可以运行：

```powershell
originpro-mcp
```

源码调试时也可以运行：

```powershell
npm start
```

Windows 上还可以双击：

```text
start-originpro-mcp.cmd
```

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

如果你不使用全局命令，而是直接从源码目录运行，可以使用：

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

修改配置后重启 Codex。

## 路径说明

- `ORIGIN_MCP_WORKDIR` 是 Origin 项目文件、导出图片等文件工具的工作目录。
- 所有文件工具只接受相对路径。
- 绝对路径和 `..` 越界路径会被拒绝。

## 说明

- 该 MCP 服务面向 OriginLab OriginPro。
- 使用 stdio transport。
- Codex 会作为 MCP client 自动管理服务进程。
