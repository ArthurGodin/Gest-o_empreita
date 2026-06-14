import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  HardHat,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const included = [
  "Clientes e catálogo de itens",
  "Orçamentos ilimitados com PDF",
  "Link público para aprovação do cliente",
  "Conversão de aprovado em obra",
  "Cobrança Pix Asaas integrada",
  "Financeiro com recebidos, pendentes e atrasados",
  "Etapas, diário com fotos e ponto da equipe",
  "Custos por obra e margem estimada",
  "Suporte direto na implantação inicial",
];

const roadmap = [
  "PWA/offline para campo após os primeiros pilotos",
  "Assinatura recorrente e cobrança automática",
  "Relatórios de margem por tipo de obra",
  "Equipe com permissões por função",
  "Templates avançados de proposta",
];

export const metadata = {
  title: "Preços - Gestão Empreita",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#121826]">
      <section className="mx-auto max-w-6xl px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#475569] hover:text-[#db5b18]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-white px-3 py-1 text-sm font-medium text-[#9a3412]">
              <ShieldCheck className="h-4 w-4" />
              Plano inicial para empresas de obra
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-normal md:text-6xl">
              Comece com um plano simples. Venda melhor esta semana.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#475569]">
              O preço inicial é pensado para pequenas empreiteiras que precisam
              sair do orçamento no caderno e controlar a obra sem contratar um
              ERP pesado.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <MiniProof icon={<FileText className="h-5 w-5" />} label="Orçamento" />
              <MiniProof icon={<HardHat className="h-5 w-5" />} label="Obra" />
              <MiniProof icon={<Wallet className="h-5 w-5" />} label="Margem" />
            </div>
          </div>

          <div className="rounded-2xl border border-[#111827] bg-[#111827] p-3 shadow-2xl">
            <div className="rounded-xl bg-white p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#db5b18]">
                    Plano Obra
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Para vender agora</h2>
                </div>
                <span className="rounded-md bg-[#e7f7ec] px-3 py-1 text-sm font-bold text-[#2f8f4e]">
                  14 dias grátis
                </span>
              </div>

              <div className="mt-7 flex items-end gap-2">
                <span className="text-5xl font-black tracking-normal">R$ 197</span>
                <span className="pb-2 text-[#475569]">/mês</span>
              </div>
              <p className="mt-2 text-sm text-[#475569]">
                Sem cartão no teste. Implantação assistida para os primeiros
                clientes.
              </p>

              <Button
                asChild
                size="lg"
                className="mt-7 h-12 w-full bg-[#db5b18] text-base hover:bg-[#bc4810]"
              >
                <Link href="/signup">
                  Começar teste
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <div className="mt-7 space-y-3">
                {included.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2f8f4e]" />
                    <span className="text-sm text-[#334155]">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <p className="text-sm font-bold">Roadmap após os primeiros pilotos</p>
                <p className="mt-1 text-xs leading-5 text-[#475569]">
                  O plano atual já cobre orçamento, obra, Pix e financeiro. Os itens
                  abaixo entram conforme o uso real mostrar prioridade.
                </p>
                <div className="mt-3 space-y-2">
                  {roadmap.map((item) => (
                    <p key={item} className="text-sm text-[#475569]">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MiniProof({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-white p-4">
      <div className="text-[#db5b18]">{icon}</div>
      <p className="mt-3 text-sm font-bold">{label}</p>
    </div>
  );
}
