import { describe, expect, it } from "vitest";

class MockTransport {
  private nextId = 1;
  private readonly pending = new Map<number, (value: unknown) => void>();

  request(method: string, params: Record<string, unknown>) {
    const id = this.nextId++;
    const payload = { id, method, params };

    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      setImmediate(() => {
        this.handleResponse({ id: payload.id, ok: true, result: payload });
      });
    });
  }

  private handleResponse(response: { id: number; ok: true; result: unknown }) {
    const pending = this.pending.get(response.id);
    this.pending.delete(response.id);
    pending?.(response.result);
  }
}

describe("bridge request flow", () => {
  it("matches JSON request IDs to responses", async () => {
    const bridge = new MockTransport();
    const result = await bridge.request("connect", { workspaceRoot: "root" });

    expect(result).toEqual({
      id: 1,
      method: "connect",
      params: { workspaceRoot: "root" }
    });
  });
});
