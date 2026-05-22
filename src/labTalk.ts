import path from "node:path";
import { AxisName, ExportFormat, GraphTheme, PageType, PlotType } from "./types.js";

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

export interface PlotStyleOptions {
  readonly graphName?: string;
  readonly layerIndex?: number;
  readonly plotIndex: number;
  readonly color?: string;
  readonly lineWidth?: number;
  readonly symbolSize?: number;
  readonly fillColor?: string;
}

export interface AxisStyleOptions {
  readonly graphName?: string;
  readonly axis: AxisName;
  readonly title?: string;
  readonly from?: number;
  readonly to?: number;
  readonly majorTicks?: number;
  readonly minorTicks?: number;
  readonly fontSize?: number;
}

export interface ComboChartOptions {
  readonly worksheetRange: string;
  readonly xColumn: number;
  readonly columnYColumn: number;
  readonly lineYColumn: number;
  readonly graphName?: string;
  readonly columnColor?: string;
  readonly lineColor?: string;
  readonly xTitle?: string;
  readonly leftYTitle?: string;
  readonly rightYTitle?: string;
}

export const graphThemePalettes: Record<GraphTheme, { column: string; line: string; accent: string }> = {
  journal: { column: "#4E79A7", line: "#E15759", accent: "#111111" },
  nature: { column: "#3C5488", line: "#E64B35", accent: "#222222" },
  science: { column: "#0072B2", line: "#D55E00", accent: "#111111" },
  cell: { column: "#00A087", line: "#E64B35", accent: "#222222" }
};

export function buildSetPlotStyleScript(options: PlotStyleOptions): string {
  const script: string[] = [];
  appendActivateGraph(script, options.graphName);

  if (!Number.isInteger(options.plotIndex) || options.plotIndex < 1) {
    throw new Error("plotIndex must be a 1-based positive integer.");
  }

  const plot = `%(${options.plotIndex})`;
  if (options.layerIndex !== undefined) {
    script.push(`page.active=${positiveInteger(options.layerIndex, "layerIndex")};`);
  }
  if (options.color) {
    script.push(`set ${plot} -cl ${labTalkColor(options.color)};`);
  }
  if (options.fillColor) {
    script.push(`set ${plot} -pfb ${labTalkColor(options.fillColor)};`);
  }
  if (options.lineWidth !== undefined) {
    script.push(`set ${plot} -w ${positiveNumber(options.lineWidth, "lineWidth")};`);
  }
  if (options.symbolSize !== undefined) {
    script.push(`set ${plot} -z ${positiveNumber(options.symbolSize, "symbolSize")};`);
  }

  return script.join("");
}

export function buildSetAxisStyleScript(options: AxisStyleOptions): string {
  const script: string[] = [];
  appendActivateGraph(script, options.graphName);

  const axisPrefix = axisLabTalkPrefix(options.axis);
  if (options.title) {
    script.push(`${axisPrefix}.title$="${escapeLabTalkString(options.title)}";`);
    script.push(`${axisPrefix}.title.font.size=${positiveNumber(options.fontSize ?? 22, "fontSize")};`);
  } else if (options.fontSize !== undefined) {
    script.push(`${axisPrefix}.title.font.size=${positiveNumber(options.fontSize, "fontSize")};`);
  }
  if (options.from !== undefined) {
    script.push(`${axisPrefix}.from=${finiteNumber(options.from, "from")};`);
  }
  if (options.to !== undefined) {
    script.push(`${axisPrefix}.to=${finiteNumber(options.to, "to")};`);
  }
  if (options.majorTicks !== undefined) {
    script.push(`${axisPrefix}.inc=${positiveNumber(options.majorTicks, "majorTicks")};`);
  }
  if (options.minorTicks !== undefined) {
    script.push(`${axisPrefix}.minorTicks=${positiveNumber(options.minorTicks, "minorTicks")};`);
  }

  return script.join("");
}

export function buildApplyGraphThemeScript(graphName: string | undefined, theme: GraphTheme): string {
  const palette = graphThemePalettes[theme];
  const script: string[] = [];
  appendActivateGraph(script, graphName);
  script.push("page -u;");
  script.push("layer -a;");
  script.push("legend -r;");
  script.push("set %H -lw 1;");
  script.push("page.active=1;");
  script.push(`set %(1) -pfb ${labTalkColor(palette.column)};`);
  script.push(`set %(1) -pbc ${labTalkColor(palette.column)};`);
  script.push("page.active=2;");
  script.push(`set %(1) -cl ${labTalkColor(palette.line)};`);
  script.push("set %(1) -w 2.4;");
  script.push("set %(1) -z 7;");
  script.push("page.active=1;");
  script.push("layer.x.label.pt=20;");
  script.push("layer.y.label.pt=20;");
  script.push("layer.x.title.font.size=22;");
  script.push("layer.y.title.font.size=22;");
  return script.join("");
}

export function buildCreateComboChartScript(options: ComboChartOptions): string {
  const palette = graphThemePalettes.nature;
  const columnColor = options.columnColor ?? palette.column;
  const lineColor = options.lineColor ?? palette.line;
  const columnScript = buildPlotXYScript(
    options.worksheetRange,
    options.xColumn,
    [options.columnYColumn],
    "column",
    options.graphName,
    "doubleY"
  );
  const lineRange = buildWorksheetXYRange(options.worksheetRange, options.xColumn, [options.lineYColumn]);
  const script: string[] = [
    columnScript,
    `plotxy ${lineRange} plot:=202 ogl:=2;`,
    "page.active=1;",
    `set %(1) -pfb ${labTalkColor(columnColor)};`,
    `set %(1) -pbc ${labTalkColor(columnColor)};`,
    "page.active=2;",
    `set %(1) -cl ${labTalkColor(lineColor)};`,
    "set %(1) -w 2.4;",
    "set %(1) -z 7;",
    "layer -a;",
    "legend -r;"
  ];

  if (options.xTitle) {
    script.push("page.active=1;");
    script.push(`x.title$="${escapeLabTalkString(options.xTitle)}";`);
  }
  if (options.leftYTitle) {
    script.push("page.active=1;");
    script.push(`y.title$="${escapeLabTalkString(options.leftYTitle)}";`);
  }
  if (options.rightYTitle) {
    script.push("page.active=2;");
    script.push(`y2.title$="${escapeLabTalkString(options.rightYTitle)}";`);
  }
  script.push("page.active=1;");

  return script.join("");
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

function appendActivateGraph(script: string[], graphName?: string) {
  if (graphName) {
    script.push(`win -a ${escapeLabTalkIdentifier(graphName)};`);
  }
}

function escapeLabTalkIdentifier(value: string): string {
  return value.replace(/[^A-Za-z0-9_]/g, "");
}

function axisLabTalkPrefix(axis: AxisName): string {
  if (axis === "x") {
    return "x";
  }
  if (axis === "y") {
    return "y";
  }
  return "y2";
}

function labTalkColor(color: string): string {
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `color("${trimmed}")`;
  }
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }
  throw new Error("Color must be a #RRGGBB hex color or an Origin color index.");
}

function positiveNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number.`);
  }
  return value;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a 1-based positive integer.`);
  }
  return value;
}

function finiteNumber(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }
  return value;
}
