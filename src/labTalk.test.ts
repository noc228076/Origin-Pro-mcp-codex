import { describe, expect, it } from "vitest";
import { buildExportGraphScript, buildPlotXYScript, buildWorksheetXYRange } from "./labTalk.js";

describe("LabTalk builders", () => {
  it("builds a worksheet XY range using 1-based columns", () => {
    expect(buildWorksheetXYRange("[Book1]Sheet1", 1, [2, 3])).toBe(
      "iy:=[Book1]Sheet1!(1,2,3)"
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
});
