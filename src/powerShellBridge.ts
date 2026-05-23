import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { once } from "node:events";
import { originPowerShellBridgeScript } from "./powershellBridgeScript.js";
import { OriginBridge } from "./types.js";

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
}

interface BridgeResponse {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export class PowerShellOriginBridge implements OriginBridge {
  private process?: ChildProcessWithoutNullStreams;
  private scriptPath?: string;
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();

  isRunning(): boolean {
    return this.process !== undefined && this.process.exitCode === null;
  }

  async request<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const child = this.ensureProcess();
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });

    const response = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject
      });
    });

    try {
      child.stdin.write(`${payload}\n`, "utf8");
    } catch (error) {
      const pending = this.pending.get(id);
      this.pending.delete(id);
      pending?.reject(error instanceof Error ? error : new Error(String(error)));
    }

    return response;
  }

  async close(): Promise<void> {
    const child = this.process;
    if (!child) {
      return;
    }

    this.process = undefined;
    child.stdin.end();

    if (child.exitCode === null) {
      child.kill();
      await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 500))]);
    }

    if (this.scriptPath) {
      fs.rmSync(this.scriptPath, { force: true });
      this.scriptPath = undefined;
    }
  }

  private ensureProcess(): ChildProcessWithoutNullStreams {
    if (this.process && this.process.exitCode === null) {
      return this.process;
    }

    const executable = process.platform === "win32" ? "powershell.exe" : "pwsh";
    this.scriptPath = path.join(
      os.tmpdir(),
      `originpro-mcp-bridge-${process.pid}-${Date.now()}.ps1`
    );
    fs.writeFileSync(this.scriptPath, originPowerShellBridgeScript, "utf8");
    const child = spawn(
      executable,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        this.scriptPath
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true
      }
    );

    this.process = child;

    const reader = readline.createInterface({ input: child.stdout });
    reader.on("line", (line) => this.handleLine(line));

    child.stderr.on("data", (chunk) => {
      const message = chunk.toString("utf8").trim();
      if (message.length > 0) {
        console.error(`[originpro-mcp:powershell] ${message}`);
      }
    });

    child.on("exit", (code, signal) => {
      const error = new Error(`PowerShell bridge exited with code ${code ?? "null"} signal ${signal ?? "null"}.`);
      for (const pending of this.pending.values()) {
        pending.reject(error);
      }
      this.pending.clear();
      if (this.scriptPath) {
        fs.rmSync(this.scriptPath, { force: true });
        this.scriptPath = undefined;
      }
      reader.close();
    });

    return child;
  }

  private handleLine(line: string): void {
    let response: BridgeResponse;
    try {
      response = JSON.parse(line) as BridgeResponse;
    } catch {
      console.error(`[originpro-mcp:powershell] ${line}`);
      return;
    }

    const pending = this.pending.get(response.id);
    if (!pending) {
      return;
    }

    this.pending.delete(response.id);

    if (response.ok) {
      pending.resolve(response.result);
      return;
    }

    pending.reject(new Error(response.error ?? "Unknown PowerShell bridge error."));
  }
}

let sharedBridge: PowerShellOriginBridge | undefined;

export function getSharedOriginBridge(): PowerShellOriginBridge {
  sharedBridge ??= new PowerShellOriginBridge();
  return sharedBridge;
}

export function getExistingOriginBridge(): PowerShellOriginBridge | undefined {
  return sharedBridge;
}

export async function resetSharedOriginBridge(): Promise<void> {
  await sharedBridge?.close();
  sharedBridge = undefined;
}
