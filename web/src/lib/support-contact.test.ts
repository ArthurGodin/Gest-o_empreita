import { describe, expect, it } from "vitest";
import {
  SUPPORT_EMAIL,
  buildSupportMailto,
  isSupportSource,
} from "./support-contact";

describe("support contact", () => {
  it("builds a generic encoded mailto from a known source", () => {
    const href = buildSupportMailto({ source: "login" });
    const url = new URL(href);

    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe(SUPPORT_EMAIL);
    expect(url.searchParams.get("subject")).toBe("Ajuda com o Prumo");
    expect(url.searchParams.get("body")).toContain(
      "Não inclua senha, cartão, documento completo ou link privado",
    );
  });

  it("uses only a known editorial topic in the subject and body", () => {
    const href = buildSupportMailto({
      source: "help_center",
      topicId: "usar-sinapi",
    });
    const url = new URL(href);

    expect(url.searchParams.get("subject")).toBe(
      "Ajuda no Prumo: Como uso a base SINAPI no orçamento?",
    );
    expect(url.searchParams.get("body")).toContain(
      "Assunto: Como uso a base SINAPI no orçamento?",
    );
  });

  it("rejects unknown runtime source and topic values", () => {
    expect(() =>
      buildSupportMailto({ source: "unknown" as "login" }),
    ).toThrow("Unknown support source");
    expect(() =>
      buildSupportMailto({ source: "help_center", topicId: "unknown" }),
    ).toThrow("Unknown help topic");
  });

  it("never injects routes, identifiers or free-form data", () => {
    const href = decodeURIComponent(
      buildSupportMailto({ source: "app_error" }),
    );

    expect(href).not.toMatch(/[0-9a-f]{8}-[0-9a-f-]{27,}/i);
    expect(href).not.toContain("/q/");
    expect(href).not.toContain("digest");
    expect(href).not.toContain("cpf");
  });

  it("recognizes only the closed support source list", () => {
    expect(isSupportSource("privacy")).toBe(true);
    expect(isSupportSource("customer-provided-value")).toBe(false);
  });
});
