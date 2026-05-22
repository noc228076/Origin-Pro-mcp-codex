import { z } from "zod/v4";
import { exportFormats } from "./labTalk.js";

export const pageTypeSchema = z.enum(["worksheet", "matrix", "graph", "layout", "notes"]);
export const plotTypeSchema = z.enum(["line", "scatter", "line_symbol", "column"]);
export const exportFormatSchema = z.enum(exportFormats);
export const visibleStateSchema = z.enum(["show", "hide", "front", "maximize", "minimize"]);
export const relativePathSchema = z.string().trim().min(1);
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
    worksheetRange: z.string().trim().min(1)
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
  origin_export_graph: z.object({
    relativePath: relativePathSchema,
    format: exportFormatSchema,
    graphName: z.string().trim().min(1).optional()
  })
};
