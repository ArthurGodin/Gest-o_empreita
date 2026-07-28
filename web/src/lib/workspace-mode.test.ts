import { describe, expect, it } from "vitest";
import {
  DEMO_WORKSPACE_BILLING_MESSAGE,
  DemoWorkspaceExternalOperationError,
  isDemoWorkspace,
  normalizeWorkspaceMode,
  requireLiveWorkspace,
} from "./workspace-mode";

describe("workspace mode", () => {
  it("normalizes only the explicit demo value as demo", () => {
    expect(normalizeWorkspaceMode("demo")).toBe("demo");
    expect(normalizeWorkspaceMode("live")).toBe("live");
    expect(normalizeWorkspaceMode("unknown")).toBe("live");
    expect(normalizeWorkspaceMode(null)).toBe("live");
  });

  it("identifies demo workspaces", () => {
    expect(isDemoWorkspace("demo")).toBe(true);
    expect(isDemoWorkspace("live")).toBe(false);
  });

  it("allows external operations in live workspaces", () => {
    expect(requireLiveWorkspace("live", "saas_checkout")).toBe("live");
  });

  it("blocks external operations in demo workspaces", () => {
    expect(() => requireLiveWorkspace("demo", "asaas_pix")).toThrowError(
      DemoWorkspaceExternalOperationError,
    );

    try {
      requireLiveWorkspace("demo", "asaas_pix");
    } catch (error) {
      expect(error).toMatchObject({
        code: "demo_workspace_external_operation_blocked",
        operation: "asaas_pix",
        message: DEMO_WORKSPACE_BILLING_MESSAGE,
      });
    }
  });
});
