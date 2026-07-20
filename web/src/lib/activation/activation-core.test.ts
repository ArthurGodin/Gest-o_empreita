import { describe, expect, it } from "vitest";
import {
  buildActivationProgress,
  type ActivationInput,
} from "./activation-core";

const company = {
  payment_provider: "manual_pix",
  pix_key_type: null,
  pix_key: null,
  pix_receiver_name: null,
  pix_receiver_city: null,
};

function input(overrides: Partial<ActivationInput> = {}): ActivationInput {
  return {
    company,
    customersCount: 0,
    quotes: [],
    projects: [],
    charges: [],
    ...overrides,
  };
}

function quote(overrides: Partial<ActivationInput["quotes"][number]> = {}) {
  return {
    id: "quote-1",
    title: "Reforma comercial",
    status: "draft",
    effective_status: "draft",
    total_cents: 0,
    project_id: null,
    sent_at: null,
    viewed_at: null,
    approved_at: null,
    ...overrides,
  };
}

describe("buildActivationProgress", () => {
  it("points a new workspace to the first customer, not payment setup", () => {
    const progress = buildActivationProgress(input());

    expect(progress.nextStep?.id).toBe("customer");
    expect(progress.nextStep?.href).toBe("/app/clientes/novo");
    expect(progress.doneCount).toBe(1);
  });

  it("keeps an empty draft on the quote step until it has a value", () => {
    const progress = buildActivationProgress(
      input({ customersCount: 1, quotes: [quote()] }),
    );

    expect(progress.nextStep?.id).toBe("quote");
    expect(progress.nextStep?.action).toBe("Continuar orçamento");
  });

  it("moves a ready proposal to review and sending", () => {
    const progress = buildActivationProgress(
      input({
        customersCount: 1,
        quotes: [quote({ total_cents: 125_000 })],
      }),
    );

    expect(progress.nextStep?.id).toBe("share");
    expect(progress.nextStep?.action).toBe("Revisar e enviar");
  });

  it("asks for receiving setup only after approval becomes a project", () => {
    const progress = buildActivationProgress(
      input({
        customersCount: 1,
        quotes: [
          quote({
            status: "approved",
            effective_status: "approved",
            total_cents: 125_000,
            sent_at: "2026-07-20T10:00:00Z",
            approved_at: "2026-07-20T11:00:00Z",
            project_id: "project-1",
          }),
        ],
        projects: [{ id: "project-1" }],
      }),
    );

    expect(progress.nextStep?.id).toBe("payment_setup");
  });

  it.each([
    ["pending", "Cobrança enviada; aguardando confirmação."],
    ["overdue", "Cobrança atrasada; revise antes de reenviar."],
    ["cancelled", "Cobrança cancelada; gere uma nova."],
  ])("describes an entry charge in %s status", (status, detail) => {
    const progress = buildActivationProgress(
      input({
        customersCount: 1,
        company: { ...company, payment_provider: "asaas" },
        quotes: [
          quote({
            status: "approved",
            effective_status: "approved",
            total_cents: 125_000,
            sent_at: "2026-07-20T10:00:00Z",
            approved_at: "2026-07-20T11:00:00Z",
            project_id: "project-1",
          }),
        ],
        projects: [{ id: "project-1" }],
        charges: [{ project_id: "project-1", kind: "entrada", status }],
      }),
    );

    expect(progress.nextStep?.id).toBe("entry_payment");
    expect(progress.nextStep?.detail).toBe(detail);
  });

  it("finishes when the first entry is confirmed", () => {
    const progress = buildActivationProgress(
      input({
        customersCount: 1,
        company: { ...company, payment_provider: "asaas" },
        quotes: [
          quote({
            status: "approved",
            effective_status: "approved",
            total_cents: 125_000,
            sent_at: "2026-07-20T10:00:00Z",
            approved_at: "2026-07-20T11:00:00Z",
            project_id: "project-1",
          }),
        ],
        projects: [{ id: "project-1" }],
        charges: [
          { project_id: "project-1", kind: "entrada", status: "confirmed" },
        ],
      }),
    );

    expect(progress.isComplete).toBe(true);
    expect(progress.nextStep).toBeNull();
    expect(progress.doneCount).toBe(progress.totalCount);
  });
});
