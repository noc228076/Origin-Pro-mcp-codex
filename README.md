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

在 Codex 的 MCP 配置中使用下面的 JSON。本示例使用本机源码路径，换机器或换目录时需要同步修改 `args` 和 `ORIGIN_MCP_WORKDIR`。

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

修改配置后重启 Codex。

## CCSwitch 配置

如果你直接从当前源码目录运行，可以在 CCSwitch 中使用下面的 JSON。本示例使用本机路径，换机器或换目录时需要同步修改 `args` 和 `ORIGIN_MCP_WORKDIR`。

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

## 路径说明

- `ORIGIN_MCP_WORKDIR` 是 Origin 项目文件、导出图片等文件工具的工作目录。
- 所有文件工具只接受相对路径。
- 绝对路径和 `..` 越界路径会被拒绝。

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
