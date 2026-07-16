import { describe, expect, it, vi } from "vitest";
import { clientErrorFor } from "./log";

vi.mock("server-only", () => ({}));

describe("clientErrorFor", () => {
  it("maps the atomic Free quote quota to the commercial message", () => {
    expect(
      clientErrorFor({ code: "P0001", message: "free_quote_limit_reached" }),
    ).toContain("3 orçamentos neste mês");
  });

  it("maps the atomic active-project quota to the commercial message", () => {
    expect(
      clientErrorFor({
        code: "P0001",
        message: "free_active_project_limit_reached",
      }),
    ).toContain("1 obra simultânea");
  });

  it("does not expose unknown database messages", () => {
    expect(
      clientErrorFor({ code: "P0001", message: "private database details" }),
    ).toBe("Não foi possível concluir a operação. Tente novamente.");
  });
});

