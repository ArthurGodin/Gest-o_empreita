import { describe, expect, it } from "vitest";
import {
  createPixBrCode,
  normalizePixKey,
  sanitizeEmvText,
  sanitizeTxid,
} from "./br-code";

describe("Pix BR Code", () => {
  it("normalizes common Pix key formats", () => {
    expect(normalizePixKey("060.243.773-39", "cpf")).toBe("06024377339");
    expect(normalizePixKey("(86) 99478-0814", "phone")).toBe("+5586994780814");
    expect(normalizePixKey(" Arthur@Email.COM ", "email")).toBe("arthur@email.com");
  });

  it("sanitizes merchant fields to EMV-safe text", () => {
    expect(sanitizeEmvText("Gestão Empreita — Timon/MA", 25)).toBe(
      "GESTAO EMPREITA TIMON/MA",
    );
    expect(sanitizeTxid("charge:abc-123_ç")).toBe("chargeabc123c");
  });

  it("generates a deterministic BR Code with CRC field", () => {
    const payload = createPixBrCode({
      key: "060.243.773-39",
      keyType: "cpf",
      receiverName: "Gestão Empreita",
      receiverCity: "Timon",
      amountCents: 19000,
      txid: "charge-abc-123",
      description: "Entrada da obra",
    });

    expect(payload).toContain("0014br.gov.bcb.pix");
    expect(payload).toContain("011106024377339");
    expect(payload).toContain("5406190.00");
    expect(payload).toContain("5915GESTAO EMPREITA");
    expect(payload).toContain("6005TIMON");
    expect(payload).toMatch(/6304[A-F0-9]{4}$/);
  });

  it("keeps merchant account info inside the EMV 99 character limit", () => {
    const payload = createPixBrCode({
      key: "cliente.com.chave.pix.email.muito.grande@example.com",
      keyType: "email",
      receiverName: "Gestão Empreita",
      receiverCity: "Timon",
      amountCents: 1000,
      txid: "charge-abc-123",
      description:
        "Descrição muito longa da obra com muitos detalhes que não pode estourar o campo EMV",
    });

    const merchantAccountStart = payload.indexOf("26");
    const merchantAccountLength = Number(
      payload.slice(merchantAccountStart + 2, merchantAccountStart + 4),
    );

    expect(merchantAccountLength).toBeLessThanOrEqual(99);
    expect(payload).toMatch(/6304[A-F0-9]{4}$/);
  });
});
