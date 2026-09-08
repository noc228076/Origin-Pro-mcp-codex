# originpro-mcp

中文 | [English](README-en.md)

适用于 AI 编程助手（Antigravity、Codex、Claude Desktop、Cursor 等）的 OriginPro MCP 服务。通过 Windows COM 自动化接口无缝驱动 OriginLab OriginPro，实现实验数据批量导入、顶刊发表级图表绘制、多图层样式精修与图片/工程导出。

## 🌟 核心特性与性能优势

- **Native COM 矩阵高速通道**：`origin_put_worksheet` 与 `origin_get_worksheet` 底层采用二维 COM SafeArray 数组传输，数据吞吐速度提升 50 倍以上（万级数据秒级注入）。
- **非交互防弹批处理**：自动注入 `@N=1; @V=1; doc -s;`，彻底禁用 Origin 模态弹窗拦截与绘图重绘 UI 刷新，杜绝自动化过程卡死。
- **全路径支持**：全面支持 Windows 绝对路径（如 `D:\Desktop\project.opju`）与工作区相对路径，支持跨盘符操作。
- **路径安全转义**：内置 LabTalk 路径反斜杠转义保护，解决 Windows 路径因 `\t`、`\n` 导致导出失败的顽疾。
- **PowerShell 7 自动发现**：自动优选 `pwsh`（PowerShell 7+）运行环境，无缝回退至系统自带的 `powershell.exe`，并配备超时安全熔断机制。
- **顶刊配色与样式一键套用**：内置 `nature`、`science`、`cell`、`journal` 经典配色主题与双 Y 轴组合图快速生成器。

## 前置条件

- **操作系统**：Windows（Origin COM Automation 仅支持 Windows）。
- **OriginLab OriginPro**：已安装并正常激活（推荐 Origin 2021 及以上版本）。
- **Node.js**：Node.js 20 或更高版本。

## 📦 安装与部署

### 方式一：从 GitHub 直接安装（推荐）

```powershell
npm install -g github:noc228076/Origin-Pro-mcp-codex
```

安装后即可在任意终端直接使用全局命令：

```powershell
originpro-mcp
```

### 方式二：从本地源码编译

```powershell
git clone https://github.com/noc228076/Origin-Pro-mcp-codex.git
cd Origin-Pro-mcp-codex
npm install
npm run build
npm link
```

## ⚙️ 客户端接入配置

### 1. Antigravity / Gemini (`mcp_config.json`)

在 `C:\Users\<YourUser>\.gemini\config\mcp_config.json` 的 `mcpServers` 中添加：

```json
{
  "mcpServers": {
    "originpro": {
      "command": "node",
      "args": [
        "D:\\APPS\\AIMCP\\origin-pro-mcp-codex\\dist\\index.js"
      ],
      "env": {
        "ORIGIN_MCP_WORKDIR": "D:\\APPS\\AIMCP\\origin-pro-mcp-codex"
      }
    }
  }
}
```

> 若已执行 `npm install -g` 或 `npm link`，亦可直接使用 `"command": "originpro-mcp"`。

### 2. Codex (`codex.json` / MCP Settings)

```json
{
  "type": "stdio",
  "command": "node",
  "args": [
    "D:\\APPS\\AIMCP\\origin-pro-mcp-codex\\dist\\index.js"
  ],
  "env": {
    "ORIGIN_MCP_WORKDIR": "D:\\APPS\\AIMCP\\origin-pro-mcp-codex"
  }
}
```

### 3. Claude Desktop (`claude_desktop_config.json`)

在 `%APPDATA%\Claude\claude_desktop_config.json` 中配置：

```json
{
  "mcpServers": {
    "originpro": {
      "command": "node",
      "args": [
        "D:\\APPS\\AIMCP\\origin-pro-mcp-codex\\dist\\index.js"
      ]
    }
  }
}
```

### 4. CCSwitch 配置

```json
{
  "type": "stdio",
  "command": "node",
  "args": [
    "D:\\APPS\\AIMCP\\origin-pro-mcp-codex\\dist\\index.js"
  ],
  "env": {
    "ORIGIN_MCP_WORKDIR": "D:\\APPS\\AIMCP\\origin-pro-mcp-codex"
  }
}
```

## 🛠️ MCP 工具清单 (23 个工具)

### 1. 连接与生命周期
| 工具名称 | 描述 |
| :--- | :--- |
| `origin_status` | 查看当前 OriginPro COM 会话连接状态与窗口可见模式 |
| `origin_connect` | 连接到现有的 Origin 实例或启动新实例（支持设置可见模式） |
| `origin_set_visible` | 设置 Origin 窗口显示状态（`show`, `hide`, `front`, `maximize`, `minimize`） |
| `origin_run` | 促使 Origin 处理挂起的自动化排队任务 |
| `origin_exit` | 安全断开 COM 连接并关闭后台 PowerShell 桥接 |

### 2. 工程文件管理
| 工具名称 | 参数 | 描述 |
| :--- | :--- | :--- |
| `origin_new_project` | 无 | 在当前会话中新建空白 Origin 工程 |
| `origin_load_project` | `relativePath` | 打开已有工程（支持相对路径或完整绝对路径，如 `D:\Desktop\demo.opju`） |
| `origin_save_project` | `relativePath` | 保存当前工程至指定路径（自动递归创建父目录） |

### 3. 工作表与数据操作
| 工具名称 | 关键参数 | 描述 |
| :--- | :--- | :--- |
| `origin_create_page` | `pageType`, `name`, `template` | 创建新窗口（工作表 `worksheet`、图形 `graph`、矩阵 `matrix` 等） |
| `origin_put_worksheet` | `worksheetRange`, `data`, `rowOffset`, `columnOffset` | 将二维数据批量高速写入工作表（原生 COM 矩阵通道） |
| `origin_get_worksheet` | `worksheetRange`, `rowOffset`, `columnOffset`, `rowCount`, `columnCount` | 高速读取工作表指定范围数据 |

### 4. 绘图与科研出版样式
| 工具名称 | 关键参数 | 描述 |
| :--- | :--- | :--- |
| `origin_plot_xy` | `worksheetRange`, `xColumn`, `yColumns`, `plotType` | 基于数据列生成标准 XY 图表（`line`, `scatter`, `line_symbol`, `column`） |
| `origin_create_combo_chart` | `xColumn`, `columnYColumn`, `lineYColumn`, `columnColor`, `lineColor` | 一键生成柱状图+折线图双 Y 轴组合图 |
| `origin_create_publication_figure` | `data`, `theme`, `titles`, `exportPath`, `exportFormat` | 全自动端到端：从数据导入、双 Y 轴绘图、套用期刊主题到高清导出 |
| `origin_set_plot_style` | `graphName`, `layerIndex`, `plotIndex`, `color`, `lineWidth`, `fillColor` | 精确微调指定图层曲线/柱状的线宽、符号大小与填充色 |
| `origin_set_axis_style` | `graphName`, `layerIndex`, `axis`, `title`, `from`, `to`, `majorTicks`, `fontSize` | 精确调节 X / Y / Y2 轴范围、刻度间距、标签大小与标题 |
| `origin_apply_graph_theme` | `graphName`, `theme` | 一键应用主流学术期刊配色方案（`nature`, `science`, `cell`, `journal`） |
| `origin_export_graph` | `relativePath`, `format`, `graphName` | 高清导出图表（支持 `png`, `pdf`, `tif`, `jpg`, `eps`, `emf`，支持绝对路径） |

### 5. 底层 LabTalk 交互
| 工具名称 | 描述 |
| :--- | :--- |
| `origin_execute_labtalk` | 执行自定义 LabTalk 脚本或批处理命令（自动防弹封装） |
| `origin_get_ltvar` / `origin_set_ltvar` | 读取 / 设置 Origin 数值型变量 |
| `origin_get_ltstr` / `origin_set_ltstr` | 读取 / 设置 Origin 字符串变量 |

## 🧭 推荐调用工作流

对于科研绘图任务，推荐优先使用封装好的高级工具组合，无需手写繁琐的底层 LabTalk：

```mermaid
graph LR
    A[origin_connect] --> B[origin_create_publication_figure]
    B --> C[origin_set_axis_style / origin_set_plot_style]
    C --> D[origin_export_graph]
    D --> E[origin_save_project]
```

## 🔧 环境变量说明

| 环境变量 | 默认值 | 作用说明 |
| :--- | :--- | :--- |
| `ORIGIN_MCP_WORKDIR` | 当前目录 | 相对路径解析的工作根目录 |
| `ORIGIN_MCP_TIMEOUT_MS` | `30000` | 单次 COM 调用的安全超时（毫秒） |
| `ORIGIN_MCP_POWERSHELL_PATH` | 自动探测 | 自定义 PowerShell 可执行程序绝对路径 |
| `ORIGIN_MCP_ALLOW_ABSOLUTE_PATHS` | `true` | 是否允许直接传递跨盘符的绝对路径 |

## 📄 开源许可

本项目基于 [MIT 许可证](LICENSE) 开源。欢迎提交 Issue 与 PR 共同完善！
