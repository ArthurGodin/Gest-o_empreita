export const WORKSPACE_MODES = ["live", "demo"] as const;

export type WorkspaceMode = (typeof WORKSPACE_MODES)[number];

export const DEMO_WORKSPACE_BILLING_MESSAGE =
  "Pagamentos reais ficam bloqueados no ambiente de demonstracao.";

export class DemoWorkspaceExternalOperationError extends Error {
  readonly code = "demo_workspace_external_operation_blocked";

  constructor(readonly operation: string) {
    super(DEMO_WORKSPACE_BILLING_MESSAGE);
    this.name = "DemoWorkspaceExternalOperationError";
  }
}

export function normalizeWorkspaceMode(value: unknown): WorkspaceMode {
  return value === "demo" ? "demo" : "live";
}

export function isDemoWorkspace(value: unknown): boolean {
  return normalizeWorkspaceMode(value) === "demo";
}

export function requireLiveWorkspace(
  value: unknown,
  operation: string,
): "live" {
  const mode = normalizeWorkspaceMode(value);
  if (mode === "demo") {
    throw new DemoWorkspaceExternalOperationError(operation);
  }
  return mode;
}
