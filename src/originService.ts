import fs from "node:fs";
import path from "node:path";
import { buildExportGraphScript, buildPlotXYScript, pageTypeCodes } from "./labTalk.js";
import {
  getExistingOriginBridge,
  getSharedOriginBridge,
  resetSharedOriginBridge
} from "./powerShellBridge.js";
import {
  ExportFormat,
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
    const resolved = resolveWorkspacePath(relativePath);
    if (!fs.existsSync(resolved.absolutePath)) {
      throw new Error(`Project file does not exist in the workspace: ${resolved.relativePath}`);
    }
    return getSharedOriginBridge().request<Record<string, unknown>>("loadProject", { ...resolved });
  }

  async saveProject(relativePath: RelativeWorkspacePath) {
    this.assertWindows();
    const resolved = resolveWorkspacePath(relativePath);
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

  async getWorksheet(worksheetRange: string) {
    this.assertWindows();
    return getSharedOriginBridge().request<Record<string, unknown>>("getWorksheet", {
      worksheetRange
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
    const resolved = resolveWorkspacePath(relativePath);
    fs.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });

    const script = buildExportGraphScript(resolved.absolutePath, format, graphName);
    const result = await getSharedOriginBridge().request<Record<string, unknown>>("execute", {
      script
    });

    return {
      relativePath: resolved.relativePath,
      format,
      script,
      ...result
    };
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

export type { VisibleState };
