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

export interface ResolveWorkspacePathOptions {
  allowAbsolute?: boolean;
}

export function resolveWorkspacePath(
  relativePath: RelativeWorkspacePath,
  workspaceRoot = getWorkspaceRoot(),
  options: ResolveWorkspacePathOptions = {}
): ResolvedWorkspacePath {
  if (typeof relativePath !== "string" || relativePath.trim().length === 0) {
    throw new WorkspacePathError("relativePath must be a non-empty relative path.");
  }

  const input = relativePath.trim();
  const allowAbsolute =
    options.allowAbsolute ?? process.env.ORIGIN_MCP_ALLOW_ABSOLUTE_PATHS === "true";

  if (allowAbsolute && (path.isAbsolute(input) || forbiddenWindowsAbsolutePattern.test(input))) {
    const absolutePath = path.resolve(input);
    return {
      relativePath: path.basename(absolutePath),
      absolutePath,
      workspaceRoot
    };
  }

  if (path.isAbsolute(input) || forbiddenWindowsAbsolutePattern.test(input)) {
    throw new WorkspacePathError("relativePath must not be an absolute path.");
  }

  const normalizedInput = input.replace(/\\/g, "/");
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
