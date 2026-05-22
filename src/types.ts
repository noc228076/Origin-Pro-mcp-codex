export type RelativeWorkspacePath = string;

export type PageType = "worksheet" | "matrix" | "graph" | "layout" | "notes";

export type WorksheetCell = string | number | boolean | null;

export type WorksheetData = WorksheetCell[][];

export type PlotType = "line" | "scatter" | "line_symbol" | "column";

export type ExportFormat = "png" | "jpg" | "tif" | "pdf" | "eps" | "bmp" | "emf";

export type AxisName = "x" | "y" | "y2";

export type GraphTheme = "journal" | "nature" | "science" | "cell";

export interface ResolvedWorkspacePath {
  readonly relativePath: RelativeWorkspacePath;
  readonly absolutePath: string;
  readonly workspaceRoot: string;
}

export interface OriginBridge {
  request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
  close(): Promise<void>;
}

export interface ToolResult<T extends object = Record<string, unknown>> extends Record<string, unknown> {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: T;
}
