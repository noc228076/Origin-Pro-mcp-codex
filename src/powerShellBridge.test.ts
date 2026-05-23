import { describe, expect, it } from "vitest";
import { originPowerShellBridgeScript } from "./powershellBridgeScript.js";

describe("PowerShell bridge script", () => {
  it("stays within a reasonable size for stdin startup", () => {
    expect(originPowerShellBridgeScript.length).toBeGreaterThan(1000);
    expect(originPowerShellBridgeScript).toContain("Invoke-OriginMethod");
  });
});
