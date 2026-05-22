import { describe, expect, it } from "vitest";
import {
  buildApplyGraphThemeScript,
  buildCreateComboChartScript,
  buildExportGraphScript,
  buildPlotXYScript,
  buildSetPlotStyleScript,
  buildWorksheetXYRange
} from "./labTalk.js";

describe("LabTalk builders", () => {
  it("builds a worksheet XY range using 1-based columns", () => {
    expect(buildWorksheetXYRange("[Book1]Sheet1", 1, [2, 3])).toBe(
      "iy:=[Book1]Sheet1!(1,2,3)"
    );
  });

  it("normalizes worksheet ranges that already include a trailing bang", () => {
    expect(buildWorksheetXYRange("[Book1]Sheet1!", 1, [2])).toBe(
      "iy:=[Book1]Sheet1!(1,2)"
    );
  });

  it("rejects invalid column indexes", () => {
    expect(() => buildWorksheetXYRange("[Book1]Sheet1", 0, [2])).toThrow(
      "1-based positive column"
    );
  });

  it("builds plotxy scripts with optional graph output", () => {
    expect(buildPlotXYScript("[Book1]Sheet1", 1, [2], "scatter", "Plot1", "Origin")).toBe(
      "plotxy iy:=[Book1]Sheet1!(1,2) plot:=201 ogl:=[<new template:=Origin name:=Plot1>];"
    );
  });

  it("builds expGraph scripts from a resolved file path", () => {
    const script = buildExportGraphScript("workspace/exports/plot.png", "png", "Plot1");
    expect(script).toContain("expGraph type:=png");
    expect(script).toContain('filename:="plot"');
    expect(script).toContain("export:=specified");
    expect(script).toContain('pages:="Plot1"');
    expect(script).toContain("overwrite:=replace");
  });

  it("builds safe plot style scripts for line and fill colors", () => {
    const script = buildSetPlotStyleScript({
      graphName: "Plot1",
      layerIndex: 1,
      plotIndex: 1,
      color: "#E64B35",
      fillColor: "#4E79A7",
      lineWidth: 2
    });

    expect(script).toContain("win -a Plot1;");
    expect(script).toContain("page.active=1;");
    expect(script).toContain('set %(1) -cl color("#E64B35");');
    expect(script).toContain('set %(1) -pfb color("#4E79A7");');
    expect(script).toContain("set %(1) -w 2;");
  });

  it("builds journal theme scripts with column-safe color options", () => {
    const script = buildApplyGraphThemeScript("Plot1", "nature");
    expect(script).toContain('set %(1) -pfb color("#3C5488");');
    expect(script).toContain('set %(1) -pbc color("#3C5488");');
    expect(script).toContain("page.active=2;");
    expect(script).toContain('set %(1) -cl color("#E64B35");');
  });

  it("builds combo chart scripts with a column and line plot", () => {
    const script = buildCreateComboChartScript({
      worksheetRange: "[Book1]Sheet1!",
      xColumn: 1,
      columnYColumn: 2,
      lineYColumn: 3,
      graphName: "Combo1"
    });

    expect(script).toContain("plotxy iy:=[Book1]Sheet1!(1,2) plot:=203");
    expect(script).toContain("plotxy iy:=[Book1]Sheet1!(1,3) plot:=202");
    expect(script).toContain("template:=doubleY");
    expect(script).toContain("set %(1) -pfb");
    expect(script).toContain("page.active=2;set %(1) -cl");
  });
});
