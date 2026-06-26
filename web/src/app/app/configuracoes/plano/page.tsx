import { redirect } from "next/navigation";
import { Check, Sparkles, Crown, Building2, FileText, Blocks, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/queries/company";
import { UpgradeButton } from "./upgrade-button";
// Badge import removed

export default async function PlanPage() {
  const company = await getActiveCompany();
  if (!company) redirect("/login");

  const supabase = createClient();
  const { data: companyData } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", company.company_id)
    .single();

  const currentPlan = companyData?.plan || "free";
  const isPro = currentPlan === "pro";

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Plano e Assinatura</h1>
        <p className="text-muted-foreground">
          Gerencie os limites da sua conta e libere todo o potencial da Prumo.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Grátis Plan Card */}
        <div className="relative rounded-2xl border bg-card p-8 shadow-sm flex flex-col h-full">
          {currentPlan === "free" && (
            <div className="absolute top-0 right-8 -translate-y-1/2">
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs bg-muted font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                Plano Atual
              </span>
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="text-2xl font-semibold mb-2">Grátis</h3>
            <p className="text-muted-foreground text-sm">
              Ideal para conhecer a plataforma e enviar os primeiros orçamentos.
            </p>
          </div>
          
          <div className="mb-8 flex items-baseline gap-1">
            <span className="text-4xl font-bold">R$ 0</span>
            <span className="text-muted-foreground font-medium">/mês</span>
          </div>

          <div className="space-y-4 mb-8 flex-1">
            <div className="flex items-start gap-3 text-sm">
              <Check className="h-5 w-5 text-green-500 shrink-0" />
              <span>Até <strong>3 orçamentos</strong> totais</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Check className="h-5 w-5 text-green-500 shrink-0" />
              <span>Até <strong>1 obra</strong> simultânea</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Check className="h-5 w-5 text-green-500 shrink-0" />
              <span>Catálogo de serviços básico</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Check className="h-5 w-5 text-green-500 shrink-0" />
              <span>Geração de PDF (com marca d&apos;água)</span>
            </div>
          </div>

          <div className="mt-auto">
            {currentPlan === "free" ? (
              <div className="w-full text-center p-3 rounded-lg border bg-muted/50 text-sm font-medium text-muted-foreground">
                Plano em uso
              </div>
            ) : (
              <div className="w-full text-center p-3 rounded-lg border border-dashed text-sm font-medium text-muted-foreground">
                Você já superou este plano
              </div>
            )}
          </div>
        </div>

        {/* PRO Plan Card */}
        <div className="relative rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-background to-background p-8 shadow-xl shadow-amber-500/5 flex flex-col h-full overflow-hidden">
          {currentPlan === "pro" && (
            <div className="absolute top-0 right-8 -translate-y-1/2">
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs bg-amber-500 hover:bg-amber-600 font-medium text-white shadow-sm transition-colors">
                <Crown className="w-3.5 h-3.5 mr-1" />
                Seu Plano
              </span>
            </div>
          )}
          
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Crown className="w-32 h-32 text-amber-500" />
          </div>

          <div className="mb-6 relative z-10">
            <h3 className="text-2xl font-bold flex items-center gap-2 text-amber-600 dark:text-amber-500">
              Profissional
              <Sparkles className="h-5 w-5" />
            </h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-[90%]">
              A suíte completa para gerenciar obras, impressionar clientes e cobrar com Pix automático.
            </p>
          </div>
          
          <div className="mb-8 flex items-baseline gap-1 relative z-10">
            <span className="text-4xl font-bold">R$ 97</span>
            <span className="text-muted-foreground font-medium">/mês</span>
          </div>

          <div className="space-y-4 mb-8 flex-1 relative z-10">
            <div className="flex items-start gap-3 text-sm font-medium">
              <Check className="h-5 w-5 text-amber-500 shrink-0" />
              <span><strong>Orçamentos Ilimitados</strong></span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Check className="h-5 w-5 text-amber-500 shrink-0" />
              <span><strong>Obras e Cronogramas Ilimitados</strong></span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Check className="h-5 w-5 text-amber-500 shrink-0" />
              <span>Geração de Cobranças Pix (Integração Asaas)</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Check className="h-5 w-5 text-amber-500 shrink-0" />
              <span>Sem marca d&apos;água nos PDFs</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Check className="h-5 w-5 text-amber-500 shrink-0" />
              <span>Suporte Prioritário por WhatsApp</span>
            </div>
          </div>

          <div className="mt-auto relative z-10">
            {currentPlan === "pro" ? (
              <div className="w-full text-center p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500 font-semibold border border-amber-500/20 flex items-center justify-center gap-2">
                <Check className="w-5 h-5" />
                Assinatura Ativa
              </div>
            ) : (
              <UpgradeButton />
            )}
            
            {!isPro && (
              <p className="text-center text-xs text-muted-foreground mt-4">
                Pagamento seguro processado via Asaas. Cancele quando quiser.
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Feature Highlights Section */}
      <div className="mt-16">
        <h3 className="text-xl font-semibold mb-6 text-center">Tudo o que você precisa para crescer</h3>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl border bg-card/50">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <h4 className="font-medium mb-2">Orçamentos que vendem</h4>
            <p className="text-sm text-muted-foreground">
              Links públicos com aceite digital e acompanhamento de leitura pelo WhatsApp.
            </p>
          </div>
          <div className="p-5 rounded-xl border bg-card/50">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
              <Building2 className="h-5 w-5 text-green-500" />
            </div>
            <h4 className="font-medium mb-2">Gestão de Obras</h4>
            <p className="text-sm text-muted-foreground">
              Transforme orçamentos aprovados em obras com 1 clique e acompanhe a execução.
            </p>
          </div>
          <div className="p-5 rounded-xl border bg-card/50">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <Blocks className="h-5 w-5 text-purple-500" />
            </div>
            <h4 className="font-medium mb-2">Cobranças Automáticas</h4>
            <p className="text-sm text-muted-foreground">
              Gere Pix de entrada e cobranças de parcelas automaticamente com a integração Asaas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
