import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  HardHat,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const included = [
  "Clientes e catálogo de itens",
  "Orçamentos ilimitados com PDF",
  "Link público para aprovação do cliente",
  "Conversão de aprovado em obra",
  "QR Code Pix direto na chave do empreiteiro",
  "Financeiro com recebidos, pendentes e atrasados",
  "Etapas, diário com fotos e ponto da equipe",
  "Custos por obra e margem estimada",
  "Suporte direto na implantação inicial",
];

const roadmap = [
  "PWA/offline para campo após os primeiros pilotos",
  "Cobrança automática para quem quiser baixa por provedor",
  "Relatórios de margem por tipo de obra",
  "Equipe com permissões por função",
  "Templates avançados de proposta",
];

export const metadata = {
  title: "Preços - Gestão Empreita",
  description:
    "Plano simples e acessível para pequenas empreiteiras. 14 dias grátis, sem cartão.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 relative overflow-hidden">
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#db5b18]/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#db5b18] to-[#ea7a3e] text-white shadow-lg shadow-[#db5b18]/20">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="text-lg tracking-tight">Gestão Empreita</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="rounded-full hover:bg-slate-100 font-medium">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-[#db5b18] hover:bg-[#bc4810] shadow-md shadow-[#db5b18]/20 font-bold">
              <Link href="/signup">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          {/* Left — Value Proposition */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-orange-50/80 px-4 py-1.5 text-sm font-bold text-[#9a3412] backdrop-blur-md shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              Plano inicial para empresas de obra
            </div>

            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Comece com um plano{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#db5b18] to-[#f47721]">
                simples.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 font-medium">
              O preço inicial é pensado para pequenas empreiteiras que precisam
              sair do orçamento no caderno e controlar a obra sem contratar um
              ERP pesado.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <MiniProof
                icon={<FileText className="h-5 w-5" />}
                label="Orçamento"
                desc="PDF profissional"
              />
              <MiniProof
                icon={<HardHat className="h-5 w-5" />}
                label="Obra"
                desc="Fotos e etapas"
              />
              <MiniProof
                icon={<Wallet className="h-5 w-5" />}
                label="Margem"
                desc="Lucro por obra"
              />
            </div>
          </div>

          {/* Right — Pricing Card */}
          <div className="group relative">
            {/* Glow behind card */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#db5b18]/20 to-blue-500/10 blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

            <div className="relative rounded-3xl border-2 border-slate-900 bg-slate-900 p-2 shadow-2xl">
              <div className="rounded-2xl bg-white p-8 md:p-10">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#db5b18]">
                      Plano Obra
                    </p>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
                      Para vender agora
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700 shadow-sm">
                    <Zap className="h-3.5 w-3.5" />
                    14 dias grátis
                  </span>
                </div>

                {/* Price */}
                <div className="mt-8 flex items-end gap-2">
                  <span className="text-6xl font-black tracking-tight">
                    R$ 197
                  </span>
                  <span className="pb-2 text-lg text-slate-500 font-medium">/mês</span>
                </div>
                <p className="mt-3 text-sm text-slate-500 font-medium">
                  Sem cartão no teste. Implantação assistida para os primeiros
                  clientes.
                </p>

                {/* CTA */}
                <Button
                  asChild
                  size="lg"
                  className="mt-8 h-14 w-full rounded-2xl bg-[#db5b18] text-base font-bold shadow-xl shadow-[#db5b18]/20 transition-all hover:scale-[1.02] hover:bg-[#bc4810] hover:shadow-2xl hover:shadow-[#db5b18]/30"
                >
                  <Link href="/signup">
                    Começar teste grátis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>

                {/* Features */}
                <div className="mt-8 space-y-3">
                  {included.map((item) => (
                    <div key={item} className="flex items-start gap-3 group/item">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      <span className="text-sm text-slate-700 font-medium group-hover/item:text-slate-900 transition-colors">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Roadmap */}
                <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-[#db5b18]" />
                    <p className="text-sm font-bold text-slate-900">
                      Roadmap após os primeiros pilotos
                    </p>
                  </div>
                  <p className="text-xs leading-5 text-slate-500 font-medium">
                    O plano atual já cobre orçamento, obra, Pix direto e
                    financeiro. Os itens abaixo entram conforme o uso real
                    mostrar prioridade.
                  </p>
                  <div className="mt-4 space-y-2">
                    {roadmap.map((item) => (
                      <p
                        key={item}
                        className="text-sm text-slate-500 font-medium pl-4 border-l-2 border-slate-200"
                      >
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MiniProof({
  icon,
  label,
  desc,
}: {
  icon: ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-5 shadow-sm hover:shadow-lg hover:border-[#db5b18]/30 transition-all duration-300">
      <div className="text-[#db5b18] group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <p className="mt-3 text-sm font-bold text-slate-900">{label}</p>
      <p className="mt-1 text-xs text-slate-500 font-medium">{desc}</p>
    </div>
  );
}
