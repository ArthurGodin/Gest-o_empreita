import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HardHat,
  ShieldCheck,
  Zap,
  Building2,
  UploadCloud,
  FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Preços - Prumo",
  description: "Escolha o plano ideal para a sua empreiteira. Do grátis ao avançado.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 relative overflow-hidden pb-24">
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#059669]/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#059669] to-[#10b981] text-white shadow-lg shadow-[#059669]/20">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="text-lg tracking-tight">Prumo</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="rounded-full hover:bg-slate-100 font-medium">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-[#059669] hover:bg-[#047857] shadow-md shadow-[#059669]/20 font-bold text-white">
              <Link href="/signup">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Pricing Header */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d1fae5] bg-emerald-50/80 px-4 py-1.5 text-sm font-bold text-[#064e3b] backdrop-blur-md shadow-sm mb-6">
          <ShieldCheck className="h-4 w-4" />
          Sem fidelidade, cancele quando quiser
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-6">
          Um sistema que <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#059669] to-[#f47721]">se paga sozinho.</span>
        </h1>
        <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto">
          Comece de graça para fechar sua primeira obra profissional. Mude de plano quando precisar controlar o financeiro e a execução.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="relative z-10 mx-auto max-w-6xl px-4">
        <div className="grid md:grid-cols-3 gap-8 items-start">
          
          {/* PLANO STARTER */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Starter</h3>
              <p className="text-sm text-slate-500 font-medium mt-2">Para experimentar e enviar a 1ª proposta matadora.</p>
            </div>
            <div className="mb-8">
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black text-slate-900">Grátis</span>
              </div>
              <p className="text-sm text-slate-500 font-medium mt-1">Para sempre.</p>
            </div>
            <Button asChild variant="outline" className="w-full h-12 rounded-xl font-bold border-slate-300 text-slate-700 hover:bg-slate-50 mb-8">
              <Link href="/signup">Começar grátis</Link>
            </Button>
            <div className="space-y-4 flex-1">
              <p className="text-sm font-bold text-slate-900">O que está incluído:</p>
              <ul className="space-y-3">
                <FeatureItem text="Até 3 orçamentos por mês" />
                <FeatureItem text="1 obra simultânea" />
                <FeatureItem text="Link público para o cliente aprovar" />
                <FeatureItem text="Orçamento em PDF" />
                <FeatureItem text="Marca d'água Prumo" />
              </ul>
            </div>
          </div>

          {/* PLANO PRO (HIGHLIGHT) */}
          <div className="relative rounded-3xl border-2 border-slate-900 bg-slate-900 p-8 shadow-2xl flex flex-col h-full transform md:-translate-y-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#059669] to-[#10b981] px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-lg">
                <Zap className="h-4 w-4" /> Mais escolhido
              </span>
            </div>
            <div className="mb-6 mt-4">
              <h3 className="text-xl font-bold text-white">Pro</h3>
              <p className="text-sm text-slate-400 font-medium mt-2">A máquina de lucro para quem já fatura com obras.</p>
            </div>
            <div className="mb-8">
              <div className="flex items-end gap-1">
                <span className="text-sm font-bold text-slate-400 mb-1">R$</span>
                <span className="text-5xl font-black text-white">97</span>
                <span className="text-sm text-slate-400 font-medium mb-1">/mês</span>
              </div>
            </div>
            <Button asChild className="w-full h-14 rounded-xl font-bold bg-[#059669] hover:bg-[#047857] text-white shadow-xl shadow-[#059669]/20 transition-transform hover:scale-[1.02] mb-8 text-base">
              <Link href="/signup?plan=pro">Assinar PRO <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <div className="space-y-4 flex-1">
              <p className="text-sm font-bold text-white">Tudo do Starter, mais:</p>
              <ul className="space-y-3">
                <FeatureItem text="Orçamentos e Obras Ilimitadas" dark />
                <FeatureItem text="Cobrança automática via Pix (Asaas)" dark />
                <FeatureItem text="Dashboard financeiro completo" dark />
                <FeatureItem text="Gestão de margem e lucro real da obra" dark />
                <FeatureItem text="Diário de obra com fotos" dark />
                <FeatureItem text="Sem marca d'água no PDF/Link" dark />
              </ul>
            </div>
          </div>

          {/* PLANO ULTIMATE */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Ultimate</h3>
              <p className="text-sm text-slate-500 font-medium mt-2">Para construtoras estruturadas e múltiplas frentes.</p>
            </div>
            <div className="mb-8">
              <div className="flex items-end gap-1">
                <span className="text-sm font-bold text-slate-500 mb-1">R$</span>
                <span className="text-4xl font-black text-slate-900">247</span>
                <span className="text-sm text-slate-500 font-medium mb-1">/mês</span>
              </div>
            </div>
            <Button asChild variant="secondary" className="w-full h-12 rounded-xl font-bold bg-slate-100 text-slate-900 hover:bg-slate-200 mb-8">
              <Link href="/signup?plan=ultimate">Assinar Ultimate</Link>
            </Button>
            <div className="space-y-4 flex-1">
              <p className="text-sm font-bold text-slate-900">Tudo do PRO, mais:</p>
              <ul className="space-y-3">
                <FeatureItem text="Importação de catálogos (Excel/CSV)" highlightIcon={<UploadCloud className="h-4 w-4 text-[#059669]" />} />
                <FeatureItem text="Base SINAPI integrada (Em breve)" highlightIcon={<Building2 className="h-4 w-4 text-[#059669]" />} />
                <FeatureItem text="Exportação de relatórios contábeis" highlightIcon={<FileSpreadsheet className="h-4 w-4 text-[#059669]" />} />
                <FeatureItem text="Múltiplos usuários e permissões" />
                <FeatureItem text="Suporte VIP WhatsApp Direto" />
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* Footer / FAQ mini */}
      <section className="mx-auto max-w-4xl px-4 mt-24 text-center">
        <p className="text-slate-500 text-sm font-medium">
          Dúvidas sobre os planos? O teste no plano PRO ou Ultimate possui garantia de 7 dias sem taxas de cancelamento. <br/>A transição de planos e importações de catálogos no plano Ultimate é feita com acompanhamento da nossa equipe.
        </p>
      </section>

    </main>
  );
}

function FeatureItem({ text, dark = false, highlightIcon }: { text: string; dark?: boolean; highlightIcon?: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      {highlightIcon ? (
        <div className="mt-0.5 shrink-0">{highlightIcon}</div>
      ) : (
        <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? 'text-emerald-400' : 'text-emerald-500'}`} />
      )}
      <span className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
        {text}
      </span>
    </li>
  );
}
