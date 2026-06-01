import { describe, expect, it } from "vitest";
import {
  canApprove,
  canConvertToProject,
  checkSendReadiness,
  effectiveStatus,
  isEditable,
} from "./quote-status";

describe("quote status helpers", () => {
  const noonBrazil = new Date("2026-05-31T15:00:00.000Z");

  it("marks sent/viewed quotes as expired only after valid_until", () => {
    expect(
      effectiveStatus(
        { status: "sent", valid_until: "2026-05-30" },
        noonBrazil,
      ),
    ).toBe("expired");
    expect(
      effectiveStatus(
        { status: "viewed", valid_until: "2026-05-31" },
        noonBrazil,
      ),
    ).toBe("viewed");
  });

  it("does not expire terminal statuses", () => {
    expect(
      effectiveStatus(
        { status: "approved", valid_until: "2026-05-01" },
        noonBrazil,
      ),
    ).toBe("approved");
  });

  it("allows editing only for drafts", () => {
    expect(isEditable("draft")).toBe(true);
    expect(isEditable("sent")).toBe(false);
  });

  it("allows public approval only for active sent states", () => {
    expect(canApprove("sent")).toBe(true);
    expect(canApprove("viewed")).toBe(true);
    expect(canApprove("expired")).toBe(false);
  });

  it("allows conversion only for approved quotes without project", () => {
    expect(canConvertToProject("approved", null)).toBe(true);
    expect(canConvertToProject("approved", "project-id")).toBe(false);
    expect(canConvertToProject("sent", null)).toBe(false);
  });

  it("returns actionable blockers before sending", () => {
    const readiness = checkSendReadiness({
      title: "",
      customer_id: null,
      valid_until: null,
      itemsCount: 0,
      total_cents: 0,
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.blockers).toEqual([
      "Adicione um título",
      "Escolha um cliente",
      "Defina a validade do orçamento",
      "Adicione ao menos 1 item",
      "Total precisa ser maior que zero",
    ]);
  });

  it("accepts complete send data", () => {
    expect(
      checkSendReadiness({
        title: "Cobertura nova",
        customer_id: "customer-id",
        valid_until: "2026-06-15",
        itemsCount: 2,
        total_cents: 100_00,
      }),
    ).toEqual({ ready: true, blockers: [] });
  });
});
