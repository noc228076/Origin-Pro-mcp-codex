import fs from "node:fs";
import path from "node:path";
import {
  buildApplyGraphThemeScript,
  buildCreateComboChartScript,
  buildExportGraphScript,
  buildPlotXYScript,
  buildSetAxisStyleScript,
  buildSetPlotStyleScript,
  pageTypeCodes
} from "./labTalk.js";
import {
  getExistingOriginBridge,
  getSharedOriginBridge,
  resetSharedOriginBridge
} from "./powerShellBridge.js";
import {
  ExportFormat,
  AxisName,
  GraphTheme,
  PageType,
  PlotType,
  RelativeWorkspacePath,
  WorksheetData
} from "./types.js";
import { getWorkspaceRoot, resolveWorkspacePath } from "./workspacePaths.js";
import { validateWorksheetData } from "./worksheet.js";

type VisibleState = "show" | "hide" | "front" | "maximize" | "minimize";

const visibleModes: Record<VisibleState, number> = {
  hide: 0,
  show: 1,
  minimize: 2,
  maximize: 3,
  front: 100
};

export class OriginService {
  async status() {
    const bridge = getExistingOriginBridge();
    const workspaceRoot = getWorkspaceRoot();

    if (!bridge?.isRunning()) {
      return {
        bridgeRunning: false,
        connected: false,
        workspace: this.workspaceInfo(workspaceRoot)
      };
    }

    const remoteStatus = await bridge.request<Record<string, unknown>>("status");
    return {
      bridgeRunning: true,
      workspace: this.workspaceInfo(workspaceRoot),
      ...remoteStatus
    };
  }

  async connect(visibleState?: VisibleState) {
    this.assertWindows();
    const bridge = getSharedOriginBridge();
    const workspaceRoot = getWorkspaceRoot();
    const result = await bridge.request<Record<string, unknown>>("connect");

    if (visibleState) {
      await this.setVisible(visibleState);
    }

    return {
      bridgeRunning: true,
      workspace: this.workspaceInfo(workspaceRoot),
      ...result
    };
  }

  async setVisible(state: VisibleState) {
    this.assertWindows();
    const bridge = getSharedOriginBridge();
    return bridge.request<Record<string, unknown>>("setVisible", {
      visibleMode: visibleModes[state],
      state
    });
  }

  async newProject() {
    this.assertWindows();
    return getSharedOriginBridge().request<Record<string, unknown>>("newProject");
  }

  async loadProject(relativePath: RelativeWorkspacePath) {
    this.assertWindows();
    const resolved = resolveWorkspacePath(relativePath, undefined, { allowAbsolute: true });
    if (!fs.existsSync(resolved.absolutePath)) {
      throw new Error(`Project file does not exist: ${resolved.absolutePath}`);
    }
    return getSharedOriginBridge().request<Record<string, unknown>>("loadProject", { ...resolved });
  }

  async saveProject(relativePath: RelativeWorkspacePath) {
    this.assertWindows();
    const resolved = resolveWorkspacePath(relativePath, undefined, { allowAbsolute: true });
    fs.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });
    return getSharedOriginBridge().request<Record<string, unknown>>("saveProject", { ...resolved });
  }

  async executeLabTalk(script: string, context?: string) {
    this.assertWindows();
    return getSharedOriginBridge().request<Record<string, unknown>>("execute", {
      script,
      context
    });
  }

  async run() {
    this.assertWindows();
    return getSharedOriginBridge().request<Record<string, unknown>>("run");
  }

  async exit() {
    const bridge = getExistingOriginBridge();
    if (bridge?.isRunning()) {
      await bridge.request("exit");
    }
    await resetSharedOriginBridge();
    return {
      bridgeRunning: false,
      connected: false
    };
  }

  async createPage(pageType: PageType, name?: string, template?: string) {
    this.assertWindows();
    return getSharedOriginBridge().request<Record<string, unknown>>("createPage", {
      pageType,
      pageCode: pageTypeCodes[pageType],
      name,
      template
    });
  }

  async putWorksheet(
    worksheetRange: string,
    data: WorksheetData,
    rowOffset = 0,
    columnOffset = 0
  ) {
    this.assertWindows();
    const validated = validateWorksheetData(data);
    return getSharedOriginBridge().request<Record<string, unknown>>("putWorksheet", {
      worksheetRange,
      data: validated,
      rowOffset,
      columnOffset
    });
  }

  async getWorksheet(
    worksheetRange: string,
    rowOffset = 0,
    columnOffset = 0,
    rowCount?: number,
    columnCount?: number
  ) {
    this.assertWindows();
    return getSharedOriginBridge().request<Record<string, unknown>>("getWorksheet", {
      worksheetRange,
      rowOffset,
      columnOffset,
      rowCount,
      columnCount
    });
  }

  async getLtVar(name: string) {
    this.assertWindows();
    return getSharedOriginBridge().request<Record<string, unknown>>("getLtVar", { name });
  }

  async setLtVar(name: string, value: number) {
    this.assertWindows();
    return getSharedOriginBridge().request<Record<string, unknown>>("setLtVar", { name, value });
  }

  async getLtStr(name: string) {
    this.assertWindows();
    return getSharedOriginBridge().request<Record<string, unknown>>("getLtStr", { name });
  }

  async setLtStr(name: string, value: string) {
    this.assertWindows();
    return getSharedOriginBridge().request<Record<string, unknown>>("setLtStr", { name, value });
  }

  async plotXY(
    worksheetRange: string,
    xColumn: number,
    yColumns: number[],
    plotType: PlotType,
    graphName?: string,
    templateName?: string
  ) {
    this.assertWindows();
    const script = buildPlotXYScript(
      worksheetRange,
      xColumn,
      yColumns,
      plotType,
      graphName,
      templateName
    );

    const result = await getSharedOriginBridge().request<Record<string, unknown>>("execute", {
      script
    });

    return {
      script,
      ...result
    };
  }

  async exportGraph(relativePath: RelativeWorkspacePath, format: ExportFormat, graphName?: string) {
    this.assertWindows();
    const resolved = resolveWorkspacePath(relativePath, undefined, { allowAbsolute: true });
    fs.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });

    const script = buildExportGraphScript(resolved.absolutePath, format, graphName);
    const result = await getSharedOriginBridge().request<Record<string, unknown>>("execute", {
      script
    });
    const exists = fs.existsSync(resolved.absolutePath);
    const sizeBytes = exists ? fs.statSync(resolved.absolutePath).size : 0;
    const ok = exists && sizeBytes > 0;

    return {
      ok,
      exists,
      sizeBytes,
      relativePath: resolved.relativePath,
      format,
      script,
      ...result
    };
  }

  async setPlotStyle(options: {
    graphName?: string;
    layerIndex?: number;
    plotIndex: number;
    color?: string;
    lineWidth?: number;
    symbolSize?: number;
    fillColor?: string;
  }) {
    this.assertWindows();
    const script = buildSetPlotStyleScript(options);
    const commandResults = await this.executeLabTalkStatements(script);

    return {
      ok: true,
      script,
      commandResults
    };
  }

  async setAxisStyle(options: {
    graphName?: string;
    layerIndex?: number;
    axis: AxisName;
    title?: string;
    from?: number;
    to?: number;
    majorTicks?: number;
    minorTicks?: number;
    fontSize?: number;
  }) {
    this.assertWindows();
    const script = buildSetAxisStyleScript(options);
    const commandResults = await this.executeLabTalkStatements(script);

    return {
      ok: true,
      script,
      commandResults
    };
  }

  async applyGraphTheme(graphName: string | undefined, theme: GraphTheme) {
    this.assertWindows();
    const script = buildApplyGraphThemeScript(graphName, theme);
    const commandResults = await this.executeLabTalkStatements(script);

    return {
      ok: true,
      script,
      theme,
      commandResults
    };
  }

  async createComboChart(options: {
    worksheetRange: string;
    xColumn: number;
    columnYColumn: number;
    lineYColumn: number;
    graphName?: string;
    columnColor?: string;
    lineColor?: string;
    xTitle?: string;
    leftYTitle?: string;
    rightYTitle?: string;
  }) {
    this.assertWindows();
    const script = buildCreateComboChartScript(options);
    const commandResults = await this.executeLabTalkStatements(script);
    const plotResults = commandResults.filter(({ statement }) => statement.startsWith("plotxy "));
    const plotOk = plotResults.length > 0 && plotResults.every(({ result }) => result !== false);
    const styleApplied = commandResults.some(({ statement }) => statement.startsWith("set "));

    return {
      ok: plotOk,
      plotOk,
      styleApplied,
      script,
      commandResults
    };
  }

  async createPublicationFigure(options: {
    data: WorksheetData;
    worksheetName?: string;
    graphName?: string;
    xColumn: number;
    columnYColumn: number;
    lineYColumn: number;
    theme: GraphTheme;
    titles: {
      x?: string;
      leftY?: string;
      rightY?: string;
    };
    exportPath?: RelativeWorkspacePath;
    exportFormat: ExportFormat;
  }) {
    this.assertWindows();
    const worksheetName = options.worksheetName ?? "publication_data";
    const graphName = options.graphName ?? "publication_figure";
    const page = await this.createPage("worksheet", worksheetName, "Origin");
    const worksheetRange = `[${page.result}]1!`;
    const write = await this.putWorksheet(worksheetRange, options.data);
    const combo = await this.createComboChart({
      worksheetRange,
      xColumn: options.xColumn,
      columnYColumn: options.columnYColumn,
      lineYColumn: options.lineYColumn,
      graphName,
      xTitle: options.titles.x,
      leftYTitle: options.titles.leftY,
      rightYTitle: options.titles.rightY
    });
    const theme = await this.applyGraphTheme(graphName, options.theme);
    const exportResult = options.exportPath
      ? await this.exportGraph(options.exportPath, options.exportFormat, graphName)
      : undefined;

    return {
      ok: Boolean(combo.ok) && (!exportResult || Boolean(exportResult.ok)),
      worksheetName,
      worksheetRange,
      graphName,
      write,
      combo,
      theme,
      export: exportResult
    };
  }

  private async executeLabTalkStatements(script: string) {
    const bridge = getSharedOriginBridge();
    const statements = splitLabTalkScript(script);

    if (statements.length === 0) {
      return [];
    }

    try {
      const response = await bridge.request<{
        ok?: boolean;
        results?: Array<{ statement: string; result: unknown }>;
        result?: unknown;
      }>("executeBatch", { statements });

      if (Array.isArray(response?.results)) {
        return response.results;
      }
      return statements.map((statement) => ({
        statement,
        result: response?.result ?? true
      }));
    } catch {
      // Fallback: sequential execution if executeBatch is unsupported
      const results: Array<{ statement: string; result: unknown }> = [];
      for (const statement of statements) {
        const response = await bridge.request<Record<string, unknown>>("execute", {
          script: `${statement};`
        });
        results.push({ statement, result: response.result });
      }
      return results;
    }
  }

  private assertWindows() {
    if (process.platform !== "win32") {
      throw new Error("OriginPro MCP requires Windows because OriginPro COM automation is Windows-only.");
    }
  }

  private workspaceInfo(workspaceRoot: string) {
    return {
      source: process.env.ORIGIN_MCP_WORKDIR ? "ORIGIN_MCP_WORKDIR" : "cwd",
      rootName: path.basename(workspaceRoot),
      absolutePathHidden: true
    };
  }
}

export function splitLabTalkScript(script: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < script.length; i++) {
    const ch = script[i];
    if ((ch === '"' || ch === "'") && (i === 0 || script[i - 1] !== "\\")) {
      if (!inQuote) {
        inQuote = true;
        quoteChar = ch;
      } else if (ch === quoteChar) {
        inQuote = false;
      }
      current += ch;
    } else if (ch === ";" && !inQuote) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = "";
    } else {
      current += ch;
    }
  }

  const remainder = current.trim();
  if (remainder.length > 0) {
    statements.push(remainder);
  }

  return statements;
}

export type { VisibleState };
