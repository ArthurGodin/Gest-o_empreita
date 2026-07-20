import { describe, expect, it } from "vitest";
import {
  buildOperationalPendencies,
  type OperationalPendencyInput,
} from "./operational-pendencies-core";

const TODAY = "2026-07-20";

describe("operational pendencies", () => {
  it("detects overdue charges by status or due date", () => {
    const result = buildOperationalPendencies({
      ...emptyInput(),
      charges: [
        charge({ id: "overdue-status", status: "overdue", due_date: null }),
        charge({ id: "overdue-date", status: "pending", due_date: "2026-07-19" }),
        charge({ id: "due-today", status: "pending", due_date: TODAY }),
        charge({ id: "future", status: "pending", due_date: "2026-07-21" }),
        charge({ id: "received", status: "received", due_date: "2026-07-01" }),
      ],
    });

    expect(result.map((item) => item.id)).toEqual([
      "billing-overdue-overdue-date",
      "billing-overdue-overdue-status",
    ]);
    expect(result[0]).toMatchObject({
      category: "billing",
      priority: "critical",
      href: "/app/obras/project-1",
      amountCents: 150_000,
    });
  });

  it("detects only open projects whose deadline is before today", () => {
    const result = buildOperationalPendencies({
      ...emptyInput(),
      projects: [
        project({ id: "late", status: "in_progress", ends_on: "2026-07-19" }),
        project({ id: "today", status: "planning", ends_on: TODAY }),
        project({ id: "future", status: "paused", ends_on: "2026-07-21" }),
        project({ id: "done", status: "completed", ends_on: "2026-07-01" }),
        project({ id: "cancelled", status: "cancelled", ends_on: "2026-07-01" }),
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "project-overdue-late",
      category: "projects",
      priority: "high",
      referenceDate: "2026-07-19",
    });
  });

  it("detects approved delivery without balance charge", () => {
    const result = buildOperationalPendencies({
      ...emptyInput(),
      projects: [
        project({ id: "missing-balance", delivery_approved_at: "2026-07-18T15:00:00Z" }),
        project({ id: "has-balance", delivery_approved_at: "2026-07-18T15:00:00Z" }),
        project({
          id: "cancelled-delivery",
          status: "cancelled",
          delivery_approved_at: "2026-07-18T15:00:00Z",
        }),
      ],
      charges: [charge({ id: "balance", project_id: "has-balance", kind: "saldo" })],
    });

    expect(result.map((item) => item.id)).toEqual([
      "project-balance-missing-balance",
    ]);
  });

  it("detects approved quotes without project and expired proposals", () => {
    const result = buildOperationalPendencies({
      ...emptyInput(),
      quotes: [
        quote({ id: "approved", effective_status: "approved", project_id: null }),
        quote({ id: "converted", effective_status: "approved", project_id: "project-1" }),
        quote({ id: "expired", effective_status: "expired", valid_until: "2026-07-10" }),
        quote({ id: "rejected", effective_status: "rejected" }),
      ],
    });

    expect(result.map((item) => item.id)).toEqual([
      "quote-expired-expired",
      "quote-approved-approved",
    ]);
    expect(result.map((item) => item.href)).toEqual([
      "/app/orcamentos/expired",
      "/app/orcamentos/approved",
    ]);
  });

  it("sorts deterministically and does not mutate the inputs", () => {
    const input: OperationalPendencyInput = {
      today: TODAY,
      quotes: [
        quote({ id: "quote-b", effective_status: "expired", valid_until: "2026-07-10" }),
        quote({ id: "quote-a", effective_status: "approved", approved_at: "2026-07-10T12:00:00Z" }),
      ],
      projects: [project({ id: "project", ends_on: "2026-07-15" })],
      charges: [charge({ id: "charge", status: "overdue", due_date: "2026-07-19" })],
    };
    const snapshot = structuredClone(input);

    const forward = buildOperationalPendencies(input);
    const reversed = buildOperationalPendencies({
      ...input,
      quotes: [...input.quotes].reverse(),
    });

    expect(forward.map((item) => item.id)).toEqual([
      "billing-overdue-charge",
      "project-overdue-project",
      "quote-approved-quote-a",
      "quote-expired-quote-b",
    ]);
    expect(reversed).toEqual(forward);
    expect(input).toEqual(snapshot);
  });
});

function emptyInput(): OperationalPendencyInput {
  return { today: TODAY, quotes: [], projects: [], charges: [] };
}

function quote(
  overrides: Partial<OperationalPendencyInput["quotes"][number]> = {},
): OperationalPendencyInput["quotes"][number] {
  return {
    id: "quote-1",
    number: "ORC-001",
    title: "Reforma completa",
    project_id: null,
    effective_status: "draft",
    valid_until: null,
    approved_at: null,
    updated_at: "2026-07-15T12:00:00Z",
    customer: { name: "Cliente Teste" },
    ...overrides,
  };
}

function project(
  overrides: Partial<OperationalPendencyInput["projects"][number]> = {},
): OperationalPendencyInput["projects"][number] {
  return {
    id: "project-1",
    name: "Obra Centro",
    status: "in_progress",
    ends_on: null,
    delivery_approved_at: null,
    updated_at: "2026-07-15T12:00:00Z",
    customer: { name: "Cliente Teste" },
    ...overrides,
  };
}

function charge(
  overrides: Partial<OperationalPendencyInput["charges"][number]> = {},
): OperationalPendencyInput["charges"][number] {
  return {
    id: "charge-1",
    project_id: "project-1",
    kind: "entrada",
    status: "pending",
    due_date: null,
    amount_cents: 150_000,
    updated_at: "2026-07-15T12:00:00Z",
    ...overrides,
  };
}
