"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
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
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { CompareSlider } from "@/components/ui/compare-slider";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";

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
    <main className="bg-slate-50 text-slate-900 overflow-x-hidden font-sans selection:bg-[#db5b18]/20 relative">
      
      {/* Background Glows Falsos para dar clima "SaaS" */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#db5b18]/10 blur-[120px]" />
        <div className="absolute right-0 top-[20%] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
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
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full hover:bg-slate-100">
              <Link href="/precos">Preços</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-full hover:bg-slate-100">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-[#db5b18] hover:bg-[#bc4810] shadow-md shadow-[#db5b18]/20 transition-all hover:shadow-lg hover:shadow-[#db5b18]/30">
              <Link href="/signup">Começar grátis</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* ACETERNITY HERO SCROLL ANIMATION */}
      <section className="relative z-10 w-full overflow-hidden pt-20">
        <ContainerScroll
          titleComponent={
            <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col items-center pb-8">
              <motion.div variants={fadeIn} className="inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-orange-50/50 px-4 py-1.5 text-sm font-semibold text-[#9a3412] backdrop-blur-sm shadow-sm mb-6">
                <ShieldCheck className="h-4 w-4" />
                Venda e controle obras sem planilhas
              </motion.div>
              
              <motion.h1 variants={fadeIn} className="max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight md:text-7xl">
                Orçamento <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#db5b18] to-[#f47721]">bonito</span>,<br/>obra no controle.
              </motion.h1>
              
              <motion.p variants={fadeIn} className="mt-6 max-w-2xl mx-auto text-lg leading-relaxed text-slate-600">
                O software elegante para pequenas empreiteiras. Crie orçamentos profissionais, receba aprovação digital do cliente e acompanhe tudo no seu celular.
              </motion.p>

              <motion.div variants={fadeIn} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
              </motion.div>
            </motion.div>
          }
        >
          <img
            src="/dashboard-mockup.png"
            alt="Dashboard Gestão Empreita"
            className="w-full h-full object-cover object-left-top"
            draggable={false}
          />
        </ContainerScroll>
      </section>

      {/* NOVA SEÇÃO: BENTO GRID */}
      <section className="relative z-10 border-y border-slate-200/50 bg-white backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              Tudo que a sua empreiteira precisa.
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Desenhado para ser simples, poderoso e impressionar o cliente final.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
            {/* Bento Item 1 - Grande */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="md:col-span-2 md:row-span-2 rounded-3xl bg-slate-50 p-8 border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-lg transition-shadow"
            >
              <div className="absolute right-0 top-0 w-64 h-64 bg-[#db5b18]/10 rounded-full blur-3xl group-hover:bg-[#db5b18]/20 transition-colors" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-[#db5b18] mb-6">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Orçamentos que vendem.</h3>
                  <p className="mt-2 text-slate-600 max-w-sm">
                    Diga adeus às planilhas confusas. Crie orçamentos elegantes em minutos, adicione sua margem invisível e envie o link para aprovação digital.
                  </p>
                </div>
                <div className="mt-8 flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm p-4 translate-y-4 group-hover:-translate-y-0 transition-transform">
                  <div className="h-4 w-1/3 bg-slate-100 rounded mb-4" />
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-slate-50 rounded" />
                    <div className="h-2 w-5/6 bg-slate-50 rounded" />
                    <div className="h-2 w-4/6 bg-slate-50 rounded" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bento Item 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="rounded-3xl bg-slate-900 p-8 border border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-lg transition-shadow text-white"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 mb-6">
                <LineChart className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Margem na mão</h3>
              <p className="mt-2 text-slate-400 text-sm">
                Saiba exatamente quanto de lucro cada obra está deixando. Controle o previsto vs realizado.
              </p>
            </motion.div>

            {/* Bento Item 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="rounded-3xl bg-white p-8 pb-0 border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-lg transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-6">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Aprovação mobile</h3>
                <p className="mt-2 text-slate-500 text-sm">
                  Seu cliente abre o orçamento no celular, assina e aprova sem precisar criar conta.
                </p>
              </div>
              
              <div className="mt-8 relative w-48 mx-auto h-40 bg-slate-900 rounded-t-[2rem] border-[6px] border-slate-800 border-b-0 shadow-xl overflow-hidden group-hover:-translate-y-2 transition-transform duration-300">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-800 rounded-full z-10" />
                <div className="absolute inset-0 bg-white pt-10 px-4">
                  <div className="w-full h-24 bg-emerald-50 rounded-xl border border-emerald-100 p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <div className="h-2 w-16 bg-slate-200 rounded-full" />
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-xs font-bold text-slate-900">Orçamento #042</div>
                    <div className="mt-2 h-6 w-full bg-emerald-500 rounded-lg flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white uppercase tracking-wider">Aprovar</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* NOVA SEÇÃO: COMPARE (ANTES / DEPOIS) & HERO HIGHLIGHT */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="text-center mb-16">
          <HeroHighlight>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: [20, -5, 0] }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
              className="text-3xl md:text-5xl font-bold text-slate-900 leading-snug"
            >
              O produto começa onde dói: <br />
              <Highlight className="text-white">venda, execução e dinheiro.</Highlight>
            </motion.h2>
          </HeroHighlight>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Reason
              title="Menos orçamento perdido no WhatsApp"
              text="Você para de mandar textos bagunçados. O cliente recebe um link limpo, com PDF e aprovação digital. Parece empresa grande."
            />
            <Reason
              title="Menos surpresa no fim da obra"
              text="Fotos, diário, ponto e gastos ficam presos à obra. O dono consegue cobrar decisões com contexto direto do canteiro."
            />
            <Reason
              title="Recebimento com Pix Automático"
              text="A tela financeira mostra aprovado, pendente, e o gasto. A cobrança via Pix vai direto pra conta e cai no extrato."
            />
          </div>

          <div className="h-[400px] md:h-[500px] w-full rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <CompareSlider
              childrenA={
                <div className="w-full h-full bg-slate-100 flex flex-col p-6 items-center justify-center">
                  <div className="bg-green-100 p-4 rounded-xl shadow-sm text-sm text-green-900 max-w-[280px] w-full">
                    "Opa fulano, o orçamento ficou em R$ 15.000 de mão de obra + 8.000 de material. Fechado?"
                  </div>
                  <div className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                    ❌ Como você faz hoje <br/>(WhatsApp)
                  </div>
                </div>
              }
              childrenB={
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center relative">
                  <img src="/dashboard-mockup.png" alt="Gestão Empreita Screenshot" className="absolute inset-0 w-full h-full object-cover object-left-top opacity-90" />
                  <div className="absolute bottom-4 text-xs font-bold text-emerald-400 uppercase tracking-widest text-center px-4 py-2 bg-slate-900/80 rounded-full backdrop-blur-sm border border-slate-800">
                    ✅ Como vai ser agora (Gestão Empreita)
                  </div>
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* ACETERNITY AURORA BACKGROUND */}
      <AuroraBackground>
        <motion.div
          initial={{ opacity: 0.0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="relative flex flex-col gap-6 items-center justify-center px-4 max-w-3xl text-center"
        >
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-lg">
            Comece pequeno, mas com cara de produto sério.
          </h2>
          <p className="font-light text-lg md:text-xl text-neutral-200 py-4 max-w-2xl">
            O primeiro cliente precisa sair com um orçamento aprovado e uma
            obra controlada. Depois disso, Pix direto, saldo e margem viram
            o centro do seu dia a dia.
          </p>
          <Button
            asChild
            size="lg"
            className="h-14 rounded-full bg-white px-8 text-lg font-bold text-[#db5b18] transition-all hover:scale-105 hover:bg-neutral-100 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
          >
            <Link href="/signup">
              Criar minha conta
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.div>
      </AuroraBackground>

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
