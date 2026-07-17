import { describe, expect, it } from "vitest";
import {
  buildAlertIdempotencyKey,
  formatOperationalAlertEmail,
  normalizeAlertRecipients,
} from "./alerts-core";

describe("operational alerts core", () => {
  it("normalizes and deduplicates alert recipients", () => {
    expect(
      normalizeAlertRecipients(
        "Arthur@Example.com; Prumo <ops@example.com>, arthur@example.com, invalid",
      ),
    ).toEqual(["arthur@example.com", "ops@example.com"]);
  });

  it("builds stable Resend idempotency keys", () => {
    expect(
      buildAlertIdempotencyKey({
        area: "Asaas Webhook",
        title: "Charge update failed!",
      }),
    ).toBe("prumo-alert-asaas-webhook:charge-update-failed");
  });

  it("escapes alert context in the HTML email", () => {
    const email = formatOperationalAlertEmail({
      appUrl: "https://gestao-empreita.vercel.app",
      area: "pdf",
      severity: "critical",
      title: "PDF falhou",
      message: "Render falhou",
      context: { quote_id: "<script>alert(1)</script>" },
    });

    expect(email.subject).toContain("[Prumo][Critico]");
    expect(email.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(email.html).not.toContain("<script>alert(1)</script>");
  });

  it("formats resolved alerts with a recovery identity", () => {
    const email = formatOperationalAlertEmail({
      appUrl: "https://gestao-empreita.vercel.app",
      area: "monitoramento",
      severity: "resolved",
      title: "Operacao recuperada",
      message: "O estado voltou ao normal.",
    });

    expect(email.subject).toContain("[Prumo][Resolvido]");
    expect(email.html).toContain("#047857");
  });
});
