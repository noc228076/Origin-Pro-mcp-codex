import { z } from "zod/v4";
import { exportFormats } from "./labTalk.js";

export const pageTypeSchema = z.enum(["worksheet", "matrix", "graph", "layout", "notes"]);
export const plotTypeSchema = z.enum(["line", "scatter", "line_symbol", "column"]);
export const exportFormatSchema = z.enum(exportFormats);
export const visibleStateSchema = z.enum(["show", "hide", "front", "maximize", "minimize"]);
export const axisNameSchema = z.enum(["x", "y", "y2"]);
export const graphThemeSchema = z.enum(["journal", "nature", "science", "cell"]);
export const colorSchema = z
  .string()
  .trim()
  .regex(/^(#[0-9a-fA-F]{6}|\d+)$/, "Use #RRGGBB or an Origin color index.");
export const relativePathSchema = z
  .string()
  .trim()
  .min(1)
  .describe("Workspace-relative or absolute file path.");
export const worksheetCellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const worksheetDataSchema = z.array(z.array(worksheetCellSchema));

export const toolInputSchemas = {
  origin_status: z.object({}),
  origin_connect: z.object({
    visibleState: visibleStateSchema.optional()
  }),
  origin_set_visible: z.object({
    state: visibleStateSchema
  }),
  origin_new_project: z.object({}),
  origin_load_project: z.object({
    relativePath: relativePathSchema
  }),
  origin_save_project: z.object({
    relativePath: relativePathSchema
  }),
  origin_run: z.object({}),
  origin_exit: z.object({}),
  origin_create_page: z.object({
    pageType: pageTypeSchema,
    name: z.string().trim().min(1).optional(),
    template: z.string().trim().min(1).optional()
  }),
  origin_put_worksheet: z.object({
    worksheetRange: z.string().trim().min(1),
    data: worksheetDataSchema,
    rowOffset: z.number().int().min(0).default(0),
    columnOffset: z.number().int().min(0).default(0)
  }),
  origin_get_worksheet: z.object({
    worksheetRange: z.string().trim().min(1),
    rowOffset: z.number().int().min(0).default(0),
    columnOffset: z.number().int().min(0).default(0),
    rowCount: z.number().int().positive().optional(),
    columnCount: z.number().int().positive().optional()
  }),
  origin_execute_labtalk: z.object({
    script: z.string().trim().min(1),
    context: z.string().trim().min(1).optional()
  }),
  origin_get_ltvar: z.object({
    name: z.string().trim().min(1)
  }),
  origin_set_ltvar: z.object({
    name: z.string().trim().min(1),
    value: z.number()
  }),
  origin_get_ltstr: z.object({
    name: z.string().trim().min(1)
  }),
  origin_set_ltstr: z.object({
    name: z.string().trim().min(1),
    value: z.string()
  }),
  origin_plot_xy: z.object({
    worksheetRange: z.string().trim().min(1),
    xColumn: z.number().int().min(1),
    yColumns: z.array(z.number().int().min(1)).min(1),
    plotType: plotTypeSchema,
    graphName: z.string().trim().min(1).optional(),
    templateName: z.string().trim().min(1).optional()
  }),
  origin_set_plot_style: z.object({
    graphName: z.string().trim().min(1).optional(),
    layerIndex: z.number().int().min(1).optional(),
    plotIndex: z.number().int().min(1),
    color: colorSchema.optional(),
    lineWidth: z.number().positive().optional(),
    symbolSize: z.number().positive().optional(),
    fillColor: colorSchema.optional()
  }),
  origin_set_axis_style: z.object({
    graphName: z.string().trim().min(1).optional(),
    layerIndex: z.number().int().min(1).optional(),
    axis: axisNameSchema,
    title: z.string().trim().min(1).optional(),
    from: z.number().optional(),
    to: z.number().optional(),
    majorTicks: z.number().positive().optional(),
    minorTicks: z.number().positive().optional(),
    fontSize: z.number().positive().optional()
  }),
  origin_apply_graph_theme: z.object({
    graphName: z.string().trim().min(1).optional(),
    theme: graphThemeSchema.default("nature")
  }),
  origin_create_combo_chart: z.object({
    worksheetRange: z.string().trim().min(1),
    xColumn: z.number().int().min(1),
    columnYColumn: z.number().int().min(1),
    lineYColumn: z.number().int().min(1),
    graphName: z.string().trim().min(1).optional(),
    columnColor: colorSchema.optional(),
    lineColor: colorSchema.optional(),
    xTitle: z.string().trim().min(1).optional(),
    leftYTitle: z.string().trim().min(1).optional(),
    rightYTitle: z.string().trim().min(1).optional()
  }),
  origin_export_graph: z.object({
    relativePath: relativePathSchema,
    format: exportFormatSchema,
    graphName: z.string().trim().min(1).optional()
  }),
  origin_create_publication_figure: z.object({
    data: worksheetDataSchema,
    worksheetName: z.string().trim().min(1).optional(),
    graphName: z.string().trim().min(1).optional(),
    xColumn: z.number().int().min(1),
    columnYColumn: z.number().int().min(1),
    lineYColumn: z.number().int().min(1),
    theme: graphThemeSchema.default("nature"),
    titles: z.object({
      x: z.string().trim().min(1).optional(),
      leftY: z.string().trim().min(1).optional(),
      rightY: z.string().trim().min(1).optional()
    }).default({}),
    exportPath: relativePathSchema.optional(),
    exportFormat: exportFormatSchema.default("png")
  })
};
