import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportFinanceDataAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getActiveCompany: vi.fn(),
  getCurrentUser: vi.fn(),
  logServerError: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/queries/company", () => ({
  getActiveCompany: mocks.getActiveCompany,
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/lib/log", () => ({
  logServerError: mocks.logServerError,
}));

const EXPORT_ERROR =
  "Não foi possível gerar o relatório agora. Tente novamente.";

function queryResult<T>(result: { data: T; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    single: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockResolvedValue(result);
  query.single.mockResolvedValue(result);
  return query;
}

function supabaseClient({
  company = {
    data: { plan: "ultimate", business_segment: "architecture" },
    error: null,
  },
  charges = { data: [], error: null },
  costs = { data: [], error: null },
}: {
  company?: { data: unknown; error: unknown };
  charges?: { data: unknown; error: unknown };
  costs?: { data: unknown; error: unknown };
} = {}) {
  const companyQuery = queryResult(company);
  const chargesQuery = queryResult(charges);
  const costsQuery = queryResult(costs);
  costsQuery.eq.mockResolvedValue(costs);

  return {
    from: vi.fn((table: string) => {
      if (table === "companies") return companyQuery;
      if (table === "billing_charges") return chargesQuery;
      if (table === "project_costs") return costsQuery;
      throw new Error(`unexpected_table:${table}`);
    }),
  };
}

describe("finance export action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-id" });
    mocks.getActiveCompany.mockResolvedValue({ company_id: "company-id" });
  });

  it("exports complete data with the company segment vocabulary", async () => {
    mocks.createClient.mockReturnValue(
      supabaseClient({
        charges: {
          data: [
            {
              paid_at: "2026-07-20T12:00:00.000Z",
              created_at: "2026-07-19T12:00:00.000Z",
              kind: "entrada",
              amount_cents: 15000,
              project: { name: "Residência Azul" },
            },
          ],
          error: null,
        },
      }),
    );

    const result = await exportFinanceDataAction();

    expect(result.ok).toBe(true);
    expect(result.csv).toContain("Data;Tipo;Projeto;Descrição");
    expect(result.csv).toContain('"Entrada do projeto"');
    expect(mocks.logServerError).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "receitas",
      charges: { data: null, error: { code: "charges_failed" } },
      costs: { data: [], error: null },
      scope: "finance.export.charges",
    },
    {
      name: "custos",
      charges: { data: [], error: null },
      costs: { data: null, error: { code: "costs_failed" } },
      scope: "finance.export.costs",
    },
  ])(
    "does not export partial data when $name fail",
    async ({ charges, costs, scope }) => {
      mocks.createClient.mockReturnValue(
        supabaseClient({ charges, costs }),
      );

      await expect(exportFinanceDataAction()).resolves.toEqual({
        ok: false,
        error: EXPORT_ERROR,
      });
      expect(mocks.logServerError).toHaveBeenCalledWith(
        scope,
        expect.anything(),
      );
    },
  );

  it("does not treat a company lookup failure as a plan downgrade", async () => {
    mocks.createClient.mockReturnValue(
      supabaseClient({
        company: {
          data: null,
          error: { code: "company_failed" },
        },
      }),
    );

    await expect(exportFinanceDataAction()).resolves.toEqual({
      ok: false,
      error: EXPORT_ERROR,
    });
    expect(mocks.logServerError).toHaveBeenCalledWith(
      "finance.export.company",
      expect.anything(),
    );
  });
});
