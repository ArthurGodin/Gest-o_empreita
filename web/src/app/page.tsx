import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  HardHat,
  LineChart,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const proofItems = [
  "Orçamento com link de aprovação",
  "Obra com etapas, fotos e gastos",
  "Pix direto e margem por projeto",
];

const workflow = [
  {
    title: "Monte o orçamento",
    text: "Itens recorrentes, preço, total e PDF profissional sem planilha.",
    icon: FileText,
  },
  {
    title: "Cliente aprova no celular",
    text: "Você manda o link. O cliente abre, aprova ou rejeita sem login.",
    icon: Smartphone,
  },
  {
    title: "Aprovado vira obra",
    text: "Etapas, diário com fotos, ponto da equipe e custos no mesmo lugar.",
    icon: HardHat,
  },
  {
    title: "Você cobra e enxerga a margem",
    text: "QR Code Pix com a chave da empreiteira, confirmação no extrato, gasto lançado e margem estimada.",
    icon: LineChart,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#121826]">
      <header className="border-b border-[#e2e8f0] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#db5b18] text-white shadow-sm">
              <HardHat className="h-5 w-5" />
            </span>
            <span>Gestão Empreita</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/precos">Preços</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="bg-[#db5b18] hover:bg-[#bc4810]">
              <Link href="/signup">Começar grátis</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1fr_0.9fr] md:items-center md:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-white px-3 py-1 text-sm font-medium text-[#9a3412]">
            <ShieldCheck className="h-4 w-4" />
            Feito para empreiteiro vender e controlar obra sem planilha
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-normal md:text-6xl">
            Orçamento bonito, obra no controle e margem na mão.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#475569]">
            Um SaaS simples para pequenas empreiteiras criarem orçamento
            profissional, receberem aprovação digital do cliente e acompanharem
            execução, fotos, equipe e gastos no celular.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 bg-[#db5b18] px-6 text-base hover:bg-[#bc4810]"
            >
              <Link href="/signup">
                Testar por 14 dias
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 border-[#cbd5e1] bg-white px-6 text-base"
            >
              <Link href="/precos">Ver preço</Link>
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {proofItems.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm text-[#334155] shadow-sm ring-1 ring-[#e2e8f0]"
              >
                <CheckCircle2 className="h-4 w-4 text-[#2f8f4e]" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <ProductPreview />
      </section>

      <section className="border-y border-[#e2e8f0] bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-4">
          {workflow.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-lg border border-[#e2e8f0] p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#fff1df] text-[#db5b18]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-base font-bold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#475569]">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[0.8fr_1fr] md:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#db5b18]">
            Por que o dono paga
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-normal">
            O produto começa onde dói: venda, execução e dinheiro.
          </h2>
        </div>
        <div className="grid gap-3">
          <Reason
            title="Menos orçamento perdido no WhatsApp"
            text="O cliente recebe um link limpo, com PDF e aprovação digital. Parece empresa grande, sem virar ERP pesado."
          />
          <Reason
            title="Menos surpresa no fim da obra"
            text="Fotos, diário, ponto e gastos ficam presos à obra. O dono consegue cobrar decisão com contexto."
          />
          <Reason
            title="Mais clareza de margem"
            text="A tela financeira mostra aprovado, Pix recebido, pendente, gasto e margem estimada. O dono sabe o que entrou e o que ainda falta cobrar."
          />
        </div>
      </section>

      <section className="bg-[#0f172a] px-4 py-14 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-3xl font-black tracking-normal">
              Comece pequeno, mas com cara de produto sério.
            </h2>
            <p className="mt-3 max-w-2xl text-[#cbd5e1]">
              O primeiro cliente precisa sair com um orçamento aprovado e uma
              obra controlada. Depois disso, o Pix direto, o saldo e a margem
              viram o centro do acompanhamento.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="h-12 bg-[#f47721] px-6 text-base text-white hover:bg-[#db5b18]"
          >
            <Link href="/signup">
              Criar minha conta
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-[#e2e8f0] bg-white px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-[#475569] md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Gestão Empreita.</p>
          <div className="flex gap-4">
            <Link href="/precos" className="hover:text-[#db5b18]">
              Preços
            </Link>
            <Link href="/termos" className="hover:text-[#db5b18]">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-[#db5b18]">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-xl border border-[#111827] bg-[#111827] p-3 shadow-2xl">
        <div className="rounded-lg bg-white p-4">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#db5b18]">
                Obra em execução
              </p>
              <h3 className="mt-1 text-lg font-black">Cobertura Maria Santos</h3>
            </div>
            <span className="rounded-md bg-[#e7f7ec] px-2 py-1 text-xs font-bold text-[#2f8f4e]">
              62% pronta
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Aprovado" value="R$ 18.400" icon={Wallet} />
            <MiniMetric label="Gasto" value="R$ 9.820" icon={ReceiptText} />
            <MiniMetric label="Margem" value="R$ 8.580" icon={LineChart} />
          </div>

          <div className="mt-4 space-y-2">
            {[
              ["Manta asfáltica", "Concluída"],
              ["Colocação de telha", "Em andamento"],
              ["Calhas e rufos", "Próxima"],
            ].map(([name, status]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border border-[#e2e8f0] bg-white px-3 py-3"
              >
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-[#475569]">{status}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[#e2e8f0] bg-white p-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Camera className="h-4 w-4 text-[#db5b18]" />
                Diário de hoje
              </div>
              <p className="mt-2 text-sm text-[#475569]">
                Equipe finalizou a manta e iniciou telha da lateral esquerda.
              </p>
            </div>
            <div className="rounded-lg border border-[#e2e8f0] bg-white p-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Smartphone className="h-4 w-4 text-[#db5b18]" />
                Link do cliente
              </div>
              <p className="mt-2 text-sm text-[#475569]">
                Cliente acompanha orçamento, aprovação e andamento sem login.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-[#e2e8f0]">
      <Icon className="h-4 w-4 text-[#db5b18]" />
      <p className="mt-2 text-xs text-[#475569]">{label}</p>
      <p className="text-sm font-black">{value}</p>
    </div>
  );
}

function Reason({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-white p-5">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 leading-7 text-[#475569]">{text}</p>
    </div>
  );
}
