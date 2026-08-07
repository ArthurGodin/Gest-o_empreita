import { BarChart3, LockKeyhole, ReceiptText, TrendingUp } from "lucide-react";
import type { PublicDemoScenario } from "@/lib/public-demo";
import {
  formatPublicDemoCurrency,
  publicDemoFinancials,
} from "@/lib/public-demo";
import {
  DemoMetricGrid,
  DemoProgress,
  DemoProtectedNote,
  DemoStatus,
  DemoViewHeader,
} from "./demo-shared";

export function DemoFinance({ scenario }: { scenario: PublicDemoScenario }) {
  const finance = publicDemoFinancials(scenario);

  return (
    <div className="space-y-5">
      <DemoViewHeader
        eyebrow="Financeiro simulado"
        title={`Resultado de ${scenario.projectName}`}
        description="Contrato, recebimentos e custos ligados ao mesmo trabalho, sem misturar clientes."
        status={<DemoStatus tone="success">Dinheiro protegido</DemoStatus>}
      />

      <DemoMetricGrid
        metrics={[
          {
            label: "Contratado",
            value: formatPublicDemoCurrency(finance.contractedCents),
            detail: scenario.quoteStatus,
          },
          {
            label: "Recebido",
            value: formatPublicDemoCurrency(finance.receivedCents),
            detail: "Entrada simulada",
            tone: "positive",
          },
          {
            label: "A receber",
            value: formatPublicDemoCurrency(finance.balanceCents),
            detail: "Saldo do contrato",
          },
          {
            label: "Custos",
            value: formatPublicDemoCurrency(finance.costsCents),
            detail: `${scenario.costs.length} registros`,
          },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <section aria-labelledby="finance-costs-title">
          <div className="mb-3 flex items-center gap-2">
            <ReceiptText aria-hidden="true" className="h-4 w-4 text-primary" />
            <h3 id="finance-costs-title" className="text-sm font-semibold">
              Custos registrados
            </h3>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="hidden grid-cols-[minmax(0,1fr)_7rem_8rem] gap-3 border-b bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground sm:grid">
              <span>Descrição</span>
              <span>Categoria</span>
              <span className="text-right">Valor</span>
            </div>
            <div className="divide-y">
              {scenario.costs.map((cost) => (
                <div
                  key={cost.description}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_8rem] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {cost.description}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                      {cost.category}
                    </p>
                  </div>
                  <span className="hidden text-sm text-muted-foreground sm:block">
                    {cost.category}
                  </span>
                  <span className="text-right text-sm font-semibold tabular-nums text-foreground">
                    {formatPublicDemoCurrency(cost.amountCents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <TrendingUp aria-hidden="true" className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Margem estimada</h3>
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">
              {formatPublicDemoCurrency(finance.marginCents)}
            </p>
            <div className="mt-4">
              <DemoProgress
                value={finance.marginPercent}
                label="Margem sobre o contrato"
              />
            </div>
          </section>

          <section className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <LockKeyhole aria-hidden="true" className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Sem movimentação real</h3>
            </div>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Esta demonstração não possui chave de pagamento, cobrança externa
              ou conexão com provedor financeiro.
            </p>
          </section>

          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <BarChart3 aria-hidden="true" className="h-4 w-4" />
            Valores recalculados a partir do cenário exibido.
          </div>
        </aside>
      </div>

      <DemoProtectedNote>
        Todos os valores são fictícios. Nenhum Pix, boleto, cartão ou cobrança é
        criado ao explorar esta tela.
      </DemoProtectedNote>
    </div>
  );
}
