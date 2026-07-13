import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");

describe("quote PDF", () => {
  it("renders a valid PDF buffer with PT-BR quote data", async () => {
    const { QuotePdf } = await import("./quote-pdf");

    const document = createElement(QuotePdf, {
      company: {
        name: "Prumo",
        legal_name: "Prumo LTDA",
        cnpj: "12.345.678/0001-90",
        phone: "(11) 98888-0000",
        email: "contato@gestaoempreita.test",
        logo_url: null,
        address: "Rua das Obras, 100",
        city: "São Paulo",
        state: "SP",
      },
      customer: {
        name: "Maria Santos",
        document: "123.456.789-00",
        phone: "(11) 97777-0000",
        email: "maria@example.com",
        address: "Avenida Central, 45",
        city: "São Paulo",
        state: "SP",
      },
      quote: {
        number: "ORC-2026-0001",
        title: "Cobertura com calhas e revisão final",
        description: "Orçamento com acentuação, unidade e total em reais.",
        valid_until: "2026-06-30",
        notes: "Garantia de 12 meses na mão de obra.",
        subtotal_cents: 260000,
        discount_cents: 0,
        total_cents: 260000,
        created_at: "2026-06-10T12:00:00.000Z",
      },
      items: [
        {
          description: "Troca de telhas quebradas",
          unit: "un",
          quantity: 12,
          unit_price_cents: 8500,
          total_cents: 102000,
        },
        {
          description: "Instalação de calhas galvanizadas",
          unit: "m",
          quantity: 20,
          unit_price_cents: 7900,
          total_cents: 158000,
        },
      ],
    });

    const buffer = await renderToBuffer(
      document as Parameters<typeof renderToBuffer>[0],
    );

    expect(buffer.length).toBeGreaterThan(3000);
    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });
});
