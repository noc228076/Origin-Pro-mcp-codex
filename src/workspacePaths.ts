import path from "node:path";
import { RelativeWorkspacePath, ResolvedWorkspacePath } from "./types.js";

const forbiddenWindowsAbsolutePattern = /^[a-zA-Z]:[\\/]/;

export class WorkspacePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspacePathError";
  }
}

export function getWorkspaceRoot(env = process.env, cwd = process.cwd()): string {
  const configured = env.ORIGIN_MCP_WORKDIR?.trim();
  return path.resolve(configured && configured.length > 0 ? configured : cwd);
}

export function resolveWorkspacePath(
  relativePath: RelativeWorkspacePath,
  workspaceRoot = getWorkspaceRoot()
): ResolvedWorkspacePath {
  if (typeof relativePath !== "string" || relativePath.trim().length === 0) {
    throw new WorkspacePathError("relativePath must be a non-empty relative path.");
  }

  if (path.isAbsolute(relativePath) || forbiddenWindowsAbsolutePattern.test(relativePath)) {
    throw new WorkspacePathError("relativePath must not be an absolute path.");
  }

  const normalizedInput = relativePath.replace(/\\/g, "/");
  const normalizedRelative = path.posix.normalize(normalizedInput);

  if (
    normalizedRelative === "." ||
    normalizedRelative === ".." ||
    normalizedRelative.startsWith("../") ||
    normalizedRelative.includes("/../")
  ) {
    throw new WorkspacePathError("relativePath must stay inside the Origin MCP workspace.");
  }

  const root = path.resolve(workspaceRoot);
  const absolutePath = path.resolve(root, normalizedRelative);
  const relativeFromRoot = path.relative(root, absolutePath);

  if (
    relativeFromRoot.length === 0 ||
    relativeFromRoot.startsWith("..") ||
    path.isAbsolute(relativeFromRoot)
  ) {
    throw new WorkspacePathError("relativePath resolves outside the Origin MCP workspace.");
  }

  return {
    relativePath: normalizedRelative,
    absolutePath,
    workspaceRoot: root
  };
}
