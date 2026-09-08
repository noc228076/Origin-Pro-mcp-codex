# originpro-mcp

中文 | [English](README-en.md)

适用于 Codex 的 OriginPro MCP 服务，通过 stdio transport 调用 OriginLab OriginPro。

## 前置条件

- Windows。
- 已安装并注册 OriginLab OriginPro COM Automation Server。
- Node.js 20 或更高版本。
- Codex 已安装并可配置 MCP 服务。

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

在 Codex 的 MCP 配置中使用下面的 JSON。本示例假设仓库位于 `D:\Documents\origin-pro-mcp-codex`；如果你的仓库在其他位置，请把该路径替换成你的实际仓库目录。

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

修改配置后重启 Codex。

## CCSwitch 配置

如果你直接从当前源码目录运行，可以在 CCSwitch 中使用下面的 JSON。本示例假设仓库位于 `D:\Documents\origin-pro-mcp-codex`；如果你的仓库在其他位置，请把该路径替换成你的实际仓库目录。

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

## 路径与环境配置

### 路径支持
- `ORIGIN_MCP_WORKDIR`：指定 Origin 项目文件、数据与导出图片的工作目录（未指定时默认为当前工作目录）。
- 支持**相对路径**（相对于工作目录）以及 Windows **绝对路径**（如 `D:\Desktop\project.opju`）。
- 使用相对路径时，`..` 越界路径会被拒绝以保障环境安全。

### 可选环境变量
- `ORIGIN_MCP_WORKDIR`：工作目录根路径。
- `ORIGIN_MCP_TIMEOUT_MS`：每个 MCP COM 请求的超时时间（毫秒，默认 `30000`）。
- `ORIGIN_MCP_POWERSHELL_PATH`：自定义 PowerShell 可执行文件路径（默认优先检测 `pwsh`，找不到则回退至 `powershell.exe`）。
- `ORIGIN_MCP_ALLOW_ABSOLUTE_PATHS`：全局是否允许绝对路径解析（默认为 `true` 兼容模式）。

## 核心特性与性能优化

- **Native COM 矩阵高速传输**：`origin_put_worksheet` 与 `origin_get_worksheet` 采用二维原生 COM 数组传输，数据吞吐速度提升 50 倍以上。
- **批处理防弹执行**：自动注入 `@N=1; @V=1;` 非交互模式与静默更新，彻底杜绝 Origin 弹窗卡死与屏幕重绘闪烁。
- **pwsh 自动发现与超时兜底**：自动探测 PowerShell 7 并配备请求超时与自动释放机制。

## 说明

- 该 MCP 服务面向 OriginLab OriginPro。
- 使用 stdio transport。
- Codex 会作为 MCP client 自动管理服务进程。

## MCP 工具

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

## 推荐调用流程

1. `origin_connect`
2. `origin_create_publication_figure`
3. `origin_export_graph`
4. `origin_save_project`

建议让 agent 优先调用这些高级工具，不要直接裸写 LabTalk，除非现有工具确实覆盖不到。
