import path from "node:path";
import { ExportFormat, PageType, PlotType } from "./types.js";

export const pageTypeCodes: Record<PageType, number> = {
  matrix: 1,
  worksheet: 2,
  graph: 3,
  layout: 4,
  notes: 5
};

export const plotTypeCodes: Record<PlotType, number> = {
  line: 200,
  scatter: 201,
  line_symbol: 202,
  column: 203
};

export const exportFormats: readonly ExportFormat[] = [
  "png",
  "jpg",
  "tif",
  "pdf",
  "eps",
  "bmp",
  "emf"
];

export function buildWorksheetXYRange(
  worksheetRange: string,
  xColumn: number,
  yColumns: number[]
): string {
  const normalizedRange = worksheetRange.trim().replace(/!+$/, "");

  if (normalizedRange.length === 0) {
    throw new Error("worksheetRange must be a non-empty LabTalk worksheet range.");
  }

  const columns = [xColumn, ...yColumns];
  if (columns.some((column) => !Number.isInteger(column) || column < 1)) {
    throw new Error("xColumn and yColumns must use 1-based positive column indexes.");
  }

  return `iy:=${normalizedRange}!(${columns.join(",")})`;
}

export function buildPlotXYScript(
  worksheetRange: string,
  xColumn: number,
  yColumns: number[],
  plotType: PlotType,
  graphName?: string,
  templateName?: string
): string {
  const range = buildWorksheetXYRange(worksheetRange, xColumn, yColumns);
  const output = buildNewGraphTarget(graphName, templateName);
  return `plotxy ${range} plot:=${plotTypeCodes[plotType]}${output};`;
}

export function buildExportGraphScript(
  absolutePath: string,
  format: ExportFormat,
  graphName?: string
): string {
  const directory = path.dirname(absolutePath);
  const basename = path.basename(absolutePath, path.extname(absolutePath));
  const graphSelector = graphName
    ? ` export:=specified pages:="${escapeLabTalkString(graphName)}"`
    : "";

  return `expGraph type:=${format} path:="${escapeLabTalkString(directory)}" filename:="${escapeLabTalkString(
    basename
  )}"${graphSelector} overwrite:=replace;`;
}

function buildNewGraphTarget(graphName?: string, templateName?: string): string {
  if (!graphName && !templateName) {
    return "";
  }

  const options: string[] = [];
  if (templateName) {
    options.push(`template:=${escapeLabTalkString(templateName)}`);
  }
  if (graphName) {
    options.push(`name:=${escapeLabTalkString(graphName)}`);
  }

  return ` ogl:=[<new ${options.join(" ")}>]`;
}

function escapeLabTalkString(value: string): string {
  return value.replace(/"/g, '\\"');
}
