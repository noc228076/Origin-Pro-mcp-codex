import path from "node:path";
import { describe, expect, it } from "vitest";
import { getWorkspaceRoot, resolveWorkspacePath, WorkspacePathError } from "./workspacePaths.js";

describe("workspace paths", () => {
  const root = path.resolve("workspace-root");
  const windowsAbsolutePath = `${"C"}:\\tmp\\x.opju`;

  it("uses ORIGIN_MCP_WORKDIR when set", () => {
    expect(getWorkspaceRoot({ ORIGIN_MCP_WORKDIR: "relative-root" }, "/tmp/project")).toBe(
      path.resolve("relative-root")
    );
  });

  it("falls back to cwd when ORIGIN_MCP_WORKDIR is not set", () => {
    expect(getWorkspaceRoot({}, root)).toBe(root);
  });

  it("resolves a relative path inside the workspace", () => {
    const resolved = resolveWorkspacePath("exports/plot.png", root);
    expect(resolved.relativePath).toBe("exports/plot.png");
    expect(resolved.absolutePath).toBe(path.resolve(root, "exports/plot.png"));
  });

  it("normalizes backslashes to logical relative paths", () => {
    const resolved = resolveWorkspacePath("exports\\plot.png", root);
    expect(resolved.relativePath).toBe("exports/plot.png");
  });

  it.each(["", "   ", "../x.opju", "nested/../../x.opju", "/tmp/x.opju", windowsAbsolutePath])(
    "rejects unsafe path %j",
    (input) => {
      expect(() => resolveWorkspacePath(input, root)).toThrow(WorkspacePathError);
    }
  );
});
