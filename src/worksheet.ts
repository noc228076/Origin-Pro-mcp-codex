import { WorksheetData } from "./types.js";

export class WorksheetDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorksheetDataError";
  }
}

export function validateWorksheetData(data: WorksheetData): WorksheetData {
  if (!Array.isArray(data)) {
    throw new WorksheetDataError("Worksheet data must be a two-dimensional array.");
  }

  if (data.length === 0) {
    return data;
  }

  if (!Array.isArray(data[0])) {
    throw new WorksheetDataError("Worksheet data rows must be arrays.");
  }

  const width = data[0].length;

  data.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      throw new WorksheetDataError(`Worksheet row ${rowIndex} must be an array.`);
    }

    if (row.length !== width) {
      throw new WorksheetDataError("Worksheet data must be rectangular.");
    }

    row.forEach((cell, columnIndex) => {
      const cellType = typeof cell;
      if (
        cell !== null &&
        cellType !== "string" &&
        cellType !== "number" &&
        cellType !== "boolean"
      ) {
        throw new WorksheetDataError(
          `Unsupported worksheet cell at row ${rowIndex}, column ${columnIndex}.`
        );
      }

      if (cellType === "number" && !Number.isFinite(cell)) {
        throw new WorksheetDataError(
          `Worksheet number at row ${rowIndex}, column ${columnIndex} must be finite.`
        );
      }
    });
  });

  return data;
}
