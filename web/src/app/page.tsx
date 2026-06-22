"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  HardHat,
  LineChart,
  ShieldCheck,
  Smartphone,
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
    text: "QR Code Pix com a chave da empreiteira, pagamento conferido no extrato, gasto lançado e margem estimada.",
    icon: LineChart,
  },
];

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-[#db5b18]/20">
      
      {/* Background Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-[#db5b18]/10 blur-[120px]" />
        <div className="absolute -right-1/4 top-1/4 h-1/2 w-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/50 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#db5b18] to-[#ea7a3e] text-white shadow-lg shadow-[#db5b18]/20">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="text-lg tracking-tight">Gestão Empreita</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full">
              <Link href="/precos">Preços</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-[#db5b18] hover:bg-[#bc4810] shadow-md shadow-[#db5b18]/20 transition-all hover:shadow-lg hover:shadow-[#db5b18]/30">
              <Link href="/signup">Começar grátis</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-32 pb-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pt-40 md:pb-24">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="relative z-10">
          <motion.div variants={fadeIn} className="inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-orange-50/50 px-4 py-1.5 text-sm font-semibold text-[#9a3412] backdrop-blur-sm shadow-sm">
            <ShieldCheck className="h-4 w-4" />
            Venda e controle obras sem planilhas
          </motion.div>
          
          <motion.h1 variants={fadeIn} className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.1] tracking-tight md:text-7xl">
            Orçamento <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#db5b18] to-[#f47721]">bonito</span>,<br/>obra no controle.
          </motion.h1>
          
          <motion.p variants={fadeIn} className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            O software elegante para pequenas empreiteiras. Crie orçamentos profissionais, receba aprovação digital do cliente e acompanhe tudo no seu celular.
          </motion.p>

          <motion.div variants={fadeIn} className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-full bg-[#db5b18] px-8 text-base font-semibold shadow-xl shadow-[#db5b18]/20 transition-all hover:scale-105 hover:bg-[#bc4810]"
            >
              <Link href="/signup">
                Testar por 14 dias
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-14 rounded-full border-slate-300 bg-white/50 px-8 text-base font-semibold backdrop-blur-sm transition-all hover:scale-105 hover:bg-white"
            >
              <Link href="/precos">Ver preços</Link>
            </Button>
          </motion.div>

          <motion.div variants={staggerContainer} className="mt-10 flex flex-wrap gap-3">
            {proofItems.map((item) => (
              <motion.span
                variants={fadeIn}
                key={item}
                className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-md"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {item}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 40, rotateY: 10 }} 
          animate={{ opacity: 1, x: 0, rotateY: 0 }} 
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative perspective-1000"
        >
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white p-2 shadow-2xl shadow-slate-300/50 transform-gpu hover:scale-[1.02] transition-transform duration-500">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
            <img
              src="/dashboard-mockup.png"
              alt="Dashboard Gestão Empreita"
              className="w-full h-auto rounded-xl object-cover ring-1 ring-slate-900/5"
            />
          </div>
          {/* Decorative floating element */}
          <motion.div 
            animate={{ y: [0, -10, 0] }} 
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute -bottom-6 -left-6 rounded-2xl bg-white p-4 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aprovado</p>
              <p className="text-sm font-bold text-slate-900">R$ 15.000,00</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="relative z-10 border-y border-slate-200/50 bg-white/50 backdrop-blur-md">
        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-4"
        >
          {workflow.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div variants={fadeIn} key={item.title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-[#db5b18]/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#db5b18] transition-colors group-hover:bg-[#db5b18] group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-lg font-bold text-slate-900">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {item.text}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-24 md:grid-cols-[0.8fr_1fr] md:items-start">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          whileInView={{ opacity: 1, x: 0 }} 
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-bold uppercase tracking-widest text-[#db5b18]">
            Por que o dono paga
          </p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
            O produto começa onde dói: venda, execução e dinheiro.
          </h2>
        </motion.div>
        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid gap-4"
        >
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
        </motion.div>
      </section>

      <section className="relative mx-4 mb-16 overflow-hidden rounded-3xl bg-slate-900 px-6 py-20 text-white shadow-2xl md:mx-auto md:max-w-6xl md:px-12">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#db5b18] blur-[100px] opacity-40" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }}
          className="relative z-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-center"
        >
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight">
              Comece pequeno, mas com cara de produto sério.
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-400">
              O primeiro cliente precisa sair com um orçamento aprovado e uma
              obra controlada. Depois disso, Pix direto, saldo e margem viram
              o centro do acompanhamento.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="h-14 rounded-full bg-[#db5b18] px-8 text-base font-bold text-white shadow-lg shadow-[#db5b18]/20 transition-all hover:scale-105 hover:bg-[#ea7a3e]"
          >
            <Link href="/signup">
              Criar minha conta
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm font-medium text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Gestão Empreita. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <Link href="/precos" className="transition-colors hover:text-[#db5b18]">
              Preços
            </Link>
            <Link href="/termos" className="transition-colors hover:text-[#db5b18]">
              Termos
            </Link>
            <Link href="/privacidade" className="transition-colors hover:text-[#db5b18]">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Reason({ title, text }: { title: string; text: string }) {
  return (
    <motion.div variants={fadeIn} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 leading-relaxed text-slate-500">{text}</p>
    </motion.div>
  );
}
