import { describe, expect, it } from "vitest";
import { toolInputSchemas } from "./toolSchemas.js";

describe("tool input schemas", () => {
  it("accepts valid project paths at schema level", () => {
    expect(
      toolInputSchemas.origin_save_project.parse({ relativePath: "projects/demo.opju" })
    ).toEqual({ relativePath: "projects/demo.opju" });
  });

  it("rejects invalid export formats", () => {
    expect(() =>
      toolInputSchemas.origin_export_graph.parse({
        relativePath: "exports/plot.svg",
        format: "svg"
      })
    ).toThrow();
  });

  it("accepts rectangular worksheet data shape at schema level", () => {
    expect(
      toolInputSchemas.origin_put_worksheet.parse({
        worksheetRange: "[Book1]Sheet1",
        data: [
          [1, 2],
          [3, 4]
        ]
      })
    ).toMatchObject({
      worksheetRange: "[Book1]Sheet1",
      rowOffset: 0,
      columnOffset: 0
    });
  });

  it("rejects invalid plot column indexes", () => {
    expect(() =>
      toolInputSchemas.origin_plot_xy.parse({
        worksheetRange: "[Book1]Sheet1",
        xColumn: 0,
        yColumns: [2],
        plotType: "line"
      })
    ).toThrow();
  });

  it("accepts bounded worksheet reads", () => {
    expect(
      toolInputSchemas.origin_get_worksheet.parse({
        worksheetRange: "[Book1]Sheet1!",
        rowOffset: 1,
        columnOffset: 2,
        rowCount: 10,
        columnCount: 3
      })
    ).toEqual({
      worksheetRange: "[Book1]Sheet1!",
      rowOffset: 1,
      columnOffset: 2,
      rowCount: 10,
      columnCount: 3
    });
  });

  it("accepts all visible states", () => {
    for (const state of ["show", "hide", "front", "maximize", "minimize"]) {
      expect(toolInputSchemas.origin_set_visible.parse({ state })).toEqual({ state });
    }
  });

  it("accepts publication figure inputs", () => {
    expect(
      toolInputSchemas.origin_create_publication_figure.parse({
        data: [
          [1, 2, 3],
          [4, 5, 6]
        ],
        xColumn: 1,
        columnYColumn: 2,
        lineYColumn: 3
      })
    ).toMatchObject({
      theme: "nature",
      exportFormat: "png"
    });
  });
});
