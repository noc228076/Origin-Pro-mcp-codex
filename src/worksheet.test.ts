import { describe, expect, it } from "vitest";
import { validateWorksheetData, WorksheetDataError } from "./worksheet.js";

describe("worksheet validation", () => {
  it("accepts rectangular worksheet data", () => {
    const data = [
      ["x", "y"],
      [1, true],
      [null, 3.14]
    ];

    expect(validateWorksheetData(data)).toBe(data);
  });

  it("accepts an empty worksheet", () => {
    expect(validateWorksheetData([])).toEqual([]);
  });

  it("rejects ragged rows", () => {
    expect(() => validateWorksheetData([[1], [1, 2]])).toThrow(WorksheetDataError);
  });

  it("rejects non-finite numbers", () => {
    expect(() => validateWorksheetData([[Number.NaN]])).toThrow(WorksheetDataError);
  });

  it("rejects unsupported cells", () => {
    expect(() => validateWorksheetData([[{ value: 1 } as never]])).toThrow(WorksheetDataError);
  });
});
