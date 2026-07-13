"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  HardHat,
  LineChart,
  ShieldCheck,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";



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
    title: "Aprovado vira obra com 1 clique",
    text: "Você confirma a conversão e segue com etapas, diário, equipe e custos.",
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  return (
    <main className="bg-slate-50 text-slate-900 overflow-x-hidden font-sans selection:bg-[#059669]/20 relative">
      
      {/* Background Glows e Pattern "SaaS Premium" */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Grid pattern suave */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60" />
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#059669]/15 blur-[120px]" />
        <div className="absolute right-0 top-[20%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#059669] to-[#10b981] text-white shadow-lg shadow-[#059669]/20">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="truncate text-lg tracking-tight">Prumo</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full hover:bg-slate-100 font-medium">
              <Link href="/precos">Preços</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-full hover:bg-slate-100 font-medium">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-[#059669] hover:bg-[#047857] shadow-md shadow-[#059669]/20 transition-all hover:shadow-lg hover:shadow-[#059669]/30 font-bold">
              <TrackedAnchor
                href="/signup"
                analyticsEvent="marketing_cta_clicked"
                analyticsProperties={{ source: "landing_header", target: "signup" }}
              >
                <span className="hidden min-[380px]:inline">Começar grátis</span>
                <span className="min-[380px]:hidden">Grátis</span>
              </TrackedAnchor>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative z-10 overflow-hidden pb-12 pt-24 sm:pb-16 sm:pt-28">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="mx-auto flex max-w-6xl flex-col items-center px-4 text-center"
        >
          <motion.div variants={fadeIn} className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-xs font-semibold text-emerald-950 shadow-sm sm:text-sm">
            <ShieldCheck className="h-4 w-4" />
            Orçamentos, obras e cobranças em um só lugar
          </motion.div>

          <motion.h1 variants={fadeIn} className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl md:text-6xl">
            Prumo: orçamento aprovado, obra no controle.
          </motion.h1>

          <motion.p variants={fadeIn} className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
            Crie propostas profissionais, receba a decisão do cliente pelo link e acompanhe execução, custos e recebimentos pelo celular ou computador.
          </motion.p>

          <motion.div variants={fadeIn} className="mt-7 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 w-full max-w-[17rem] rounded-full bg-[#059669] px-7 text-base font-bold shadow-lg shadow-[#059669]/20 transition-colors hover:bg-[#047857] sm:w-auto"
            >
              <TrackedAnchor
                href="/signup"
                analyticsEvent="marketing_cta_clicked"
                analyticsProperties={{ source: "landing_hero", target: "signup" }}
              >
                Começar grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </TrackedAnchor>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 w-full max-w-[17rem] rounded-full border-slate-300 bg-white/90 px-6 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-[#059669]/50 hover:bg-emerald-50 hover:text-[#047857] sm:w-auto"
            >
              <TrackedAnchor
                href="/precos"
                analyticsEvent="marketing_cta_clicked"
                analyticsProperties={{ source: "landing_hero", target: "pricing" }}
              >
                Ver planos e preços
              </TrackedAnchor>
            </Button>
          </motion.div>

          <motion.div variants={fadeIn} className="mt-6 flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-slate-600">
            {["Plano grátis sem cartão", "Cliente aprova sem login", "Celular e computador"].map((fact) => (
              <span key={fact} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {fact}
              </span>
            ))}
          </motion.div>

          <motion.div variants={fadeIn} className="mt-8 w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/15 sm:p-2">
            <Image
              src="/dashboard-mockup.png"
              alt="Painel do Prumo com visão financeira e acompanhamento das obras"
              width={1024}
              height={561}
              priority
              sizes="(max-width: 768px) 100vw, 1024px"
              className="h-auto w-full rounded-md object-contain"
              draggable={false}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* SEÇÃO BENTO GRID */}
      <section className="relative z-10 border-y border-slate-200/50 bg-white backdrop-blur-md shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            className="mb-8 text-center md:mb-12"
          >
            <h2 className="text-[2rem] font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Tudo que a sua empreiteira precisa.
            </h2>
            <p className="mt-4 text-base font-medium leading-7 text-slate-500 md:text-lg">
              Desenhado para ser simples, poderoso e impressionar o cliente final.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 auto-rows-auto md:grid-cols-3 md:gap-5 md:auto-rows-[250px]">
            {/* Bento Item 1 - Grande */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-50 p-4 shadow-sm transition-all duration-300 hover:shadow-xl md:col-span-2 md:row-span-2 md:p-8"
            >
              <div className="absolute right-0 top-0 w-64 h-64 bg-[#059669]/10 rounded-full blur-3xl group-hover:bg-[#059669]/20 transition-colors" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-[#059669] mb-6 shadow-sm">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Orçamentos que vendem.</h3>
                  <p className="mt-3 max-w-md text-sm font-medium leading-6 text-slate-600 md:text-base md:leading-relaxed">
                    Diga adeus às planilhas confusas. Crie orçamentos elegantes em minutos, adicione sua margem invisível e envie o link para aprovação digital.
                  </p>
                </div>
                
                {/* Mini-UI interativa */}
                <div className="mt-5 max-w-md rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-xl backdrop-blur-md transition-transform duration-500 group-hover:-translate-y-0 md:mt-7 md:flex-1 md:translate-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gradient-to-br from-[#059669] to-[#10b981] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                        GE
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">Reforma Cozinha</div>
                        <div className="text-[10px] text-slate-500 font-medium">Para: Maria Santos</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total</div>
                      <div className="text-xl font-black text-[#059669]">R$ 14.500</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-xs text-slate-600 font-medium">Porcelanato e Argamassa</span>
                      <span className="text-xs font-semibold text-slate-900">R$ 4.200</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-xs text-slate-600 font-medium">Mão de obra especializada</span>
                      <span className="text-xs font-semibold text-slate-900">R$ 8.000</span>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100/50 shadow-sm px-4 py-2.5 rounded-xl w-fit transition-transform hover:scale-105">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">Aprovado pelo cliente</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bento Item 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-4 pb-0 text-white shadow-xl transition-all duration-300 hover:shadow-2xl md:p-6 md:pb-0"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mb-4">
                  <LineChart className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Margem na mão</h3>
                <p className="mt-1 text-slate-400 text-sm font-medium leading-relaxed">
                  Saiba exatamente quanto de lucro cada obra está deixando. Controle o previsto vs realizado.
                </p>
              </div>

              {/* Mini-UI Chart */}
              <div className="relative z-10 mt-auto bg-slate-800/80 backdrop-blur-xl rounded-t-2xl border border-slate-700/50 border-b-0 p-4 pb-2 translate-y-6 group-hover:translate-y-0 transition-transform duration-500 shadow-2xl">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Lucro Estimado</div>
                    <div className="text-2xl font-black text-emerald-400">28.5%</div>
                  </div>
                  <div className="h-5 px-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +4.2%
                  </div>
                </div>
                <div className="h-10 w-full flex items-end gap-1.5 opacity-90">
                  <div className="w-1/6 bg-slate-700 h-[30%] rounded-t-sm" />
                  <div className="w-1/6 bg-slate-700 h-[45%] rounded-t-sm" />
                  <div className="w-1/6 bg-emerald-500/60 h-[60%] rounded-t-sm" />
                  <div className="w-1/6 bg-slate-700 h-[50%] rounded-t-sm" />
                  <div className="w-1/6 bg-emerald-500/80 h-[80%] rounded-t-sm" />
                  <div className="w-1/6 bg-emerald-400 h-[100%] rounded-t-sm shadow-[0_0_15px_rgba(52,211,153,0.6)]" />
                </div>
              </div>
            </motion.div>

            {/* Bento Item 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-4 pb-0 shadow-sm transition-all duration-300 hover:shadow-xl md:p-6 md:pb-0"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-blue-600 mb-6 shadow-sm border border-blue-100/50">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Aprovação mobile</h3>
                <p className="mt-2 text-slate-500 text-sm font-medium leading-relaxed">
                  Seu cliente abre o orçamento no celular, assina e aprova sem precisar criar conta.
                </p>
              </div>
              
              <div className="mt-8 relative w-48 mx-auto h-[240px] -mb-20 bg-slate-900 rounded-t-[2rem] border-[6px] border-slate-800 border-b-0 shadow-2xl overflow-hidden group-hover:-translate-y-4 transition-transform duration-500">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-800 rounded-full z-10" />
                <div className="absolute inset-0 bg-white pt-10 px-4">
                  <div className="w-full h-24 bg-emerald-50 rounded-xl border border-emerald-100 p-3 flex flex-col justify-between shadow-inner">
                    <div className="flex justify-between items-center">
                      <div className="h-2 w-16 bg-slate-200 rounded-full" />
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 tracking-tight">Orçamento #042</div>
                    <div className="mt-2 h-6 w-full bg-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                      <span className="text-[9px] font-extrabold text-white uppercase tracking-wider">Aprovar</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: COMO FUNCIONA (4 passos) */}
      <section className="relative z-10 bg-slate-50 py-14 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 text-center md:mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm mb-6">
              <ArrowRight className="h-4 w-4 text-[#059669]" /> 4 passos para receber
            </div>
            <h2 className="text-[2rem] font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Do orçamento ao <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#059669] to-[#f47721]">Pix na conta.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
            {workflow.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group relative rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm md:border-0 md:bg-transparent md:p-0 md:text-center md:shadow-none"
              >
                {/* Connector line */}
                {i < workflow.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-slate-200 to-slate-100" />
                )}
                <div className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-100 bg-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:border-[#059669]/30 group-hover:shadow-xl md:mx-auto md:mb-6 md:h-20 md:w-20 md:rounded-3xl">
                  <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-[#059669] text-white text-xs font-black flex items-center justify-center shadow-md">{i + 1}</span>
                  <step.icon className="h-6 w-6 text-slate-600 transition-colors group-hover:text-[#059669] md:h-8 md:w-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500 md:mx-auto md:max-w-[220px]">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO: O PRODUTO COMEÇA ONDE DÓI */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-24">
        <div className="mb-8 text-center md:mb-14">
          <HeroHighlight>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: [20, -5, 0] }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
              className="text-[2rem] font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl md:leading-snug"
            >
              O produto começa onde dói: <br />
              <Highlight className="text-white">venda, execução e dinheiro.</Highlight>
            </motion.h2>
          </HeroHighlight>
        </div>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="space-y-6">
            <Reason
              title="Menos orçamento perdido no WhatsApp"
              text="Você para de mandar textos bagunçados. O cliente recebe um link limpo, com PDF e aprovação digital. Parece empresa grande."
              icon={<FileText className="h-5 w-5 text-[#059669]" />}
            />
            <Reason
              title="Menos surpresa no fim da obra"
              text="Fotos, diário, ponto e gastos ficam presos à obra. O dono consegue cobrar decisões com contexto direto do canteiro."
              icon={<HardHat className="h-5 w-5 text-[#059669]" />}
            />
            <Reason
              title="Recebimento com Pix Automático"
              text="A tela financeira mostra aprovado, pendente, e o gasto. A cobrança via Pix vai direto pra conta e cai no extrato."
              icon={<LineChart className="h-5 w-5 text-[#059669]" />}
            />
          </div>

          {/* Showcase Flutuante Impactante */}
          <div className="relative h-[300px] w-full perspective-1000 md:h-[500px]">
            {/* Elemento de fundo: Dashboard */}
            <motion.div
              animate={{ y: [-12, 12, -12], rotateX: [2, -2, 2], rotateY: [-2, 2, -2] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 right-0 w-[90%] h-[75%] rounded-2xl overflow-hidden shadow-2xl border border-slate-200/80 bg-white"
            >
              <div className="h-8 bg-slate-100/80 backdrop-blur-sm border-b border-slate-200 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <Image src="/dashboard-mockup.png" alt="Painel financeiro do Prumo" width={1024} height={561} sizes="(max-width: 768px) 90vw, 540px" className="w-full h-full object-cover object-left-top select-none pointer-events-none opacity-95" draggable={false} />
            </motion.div>

            {/* Elemento frontal flutuante: Orçamento */}
            <motion.div
              animate={{ y: [15, -15, 15], rotateZ: [-2, 1, -2] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-4 left-0 w-[65%] h-[80%] rounded-2xl overflow-hidden shadow-[0_30px_80px_-15px_rgba(0,0,0,0.4)] border-2 border-white bg-white"
            >
               <Image src="/quote-mockup.png" alt="Orçamento público do Prumo" width={923} height={717} sizes="(max-width: 768px) 65vw, 390px" className="w-full h-full object-cover object-top select-none pointer-events-none" draggable={false} />
            </motion.div>

            {/* Selo de Destaque Flutuante */}
            <motion.div
              animate={{ y: [-5, 5, -5], scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute right-1 top-[58%] flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-900 p-3 text-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-xl md:-right-8 md:top-[55%] md:p-4"
            >
              <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-inner">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Link do Orçamento</p>
                <p className="text-sm font-black text-emerald-400">Aprovado online</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: PROVA DO PRODUTO */}
      <section className="relative z-10 border-y border-slate-200/50 bg-white py-14 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 text-center md:mb-12">
            <h2 className="text-[2rem] font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Um fluxo completo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#059669] to-[#f47721]">sem promessas vazias.</span>
            </h2>
            <p className="mt-4 text-base font-medium leading-7 text-slate-500 md:text-lg">O que você já consegue fazer no Prumo hoje.</p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3 md:gap-5">
            {[
              { title: "Proposta rastreável", text: "Crie o orçamento, gere PDF, envie o link e acompanhe visualização, aceite ou recusa." },
              { title: "Obra ligada à venda", text: "Transforme o orçamento aprovado em obra com um clique, mantendo cliente e valor vinculados." },
              { title: "Dinheiro por obra", text: "Organize entrada, saldo, custos e margem estimada sem misturar os números de projetos diferentes." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm md:p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  {i === 0 ? <FileText className="h-5 w-5" /> : i === 1 ? <HardHat className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                </div>
                <h3 className="font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO: FAQ */}
      <section className="bg-slate-50 py-14 md:py-24">
        <div className="mx-auto max-w-3xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 text-center md:mb-12">
            <h2 className="text-[2rem] font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">Dúvidas frequentes</h2>
            <p className="mt-4 text-base font-medium leading-7 text-slate-500 md:text-lg">Tudo que você precisa saber antes de começar.</p>
          </motion.div>

          <div className="space-y-3 md:space-y-4">
            {[
              { q: "Preciso instalar alguma coisa?", a: "Não. O Prumo funciona 100% no navegador, no celular ou no computador. Basta criar a conta e começar." },
              { q: "Meu cliente precisa criar conta para aprovar?", a: "Não. Ele recebe um link único e privado. Abre no celular, vê o orçamento completo e aprova com um clique." },
              { q: "Como funciona o Pix?", a: "Você escolhe entre Pix direto na sua chave, com confirmação manual pelo extrato, ou Asaas, com cobrança e baixa pelo provedor. O Prumo organiza entrada e saldo por obra." },
              { q: "E se eu quiser cancelar?", a: "O proprietário cancela na tela de planos. A recorrência é encerrada e a conta volta ao Grátis imediatamente. O cancelamento comum não gera reembolso automático, sem prejuízo dos direitos previstos em lei." },
              { q: "Tem período de teste?", a: "Não há teste temporário. Existe um Plano Grátis, sem cartão, com até 3 orçamentos por mês e 1 obra simultânea." },
              { q: "Para quais serviços o Prumo serve?", a: "O fluxo atende reformas, coberturas, acabamentos, pintura, elétrica e outros serviços de empreitada. Os itens e etapas são personalizáveis." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full cursor-pointer select-none items-center justify-between px-4 py-3.5 text-left text-base font-bold text-slate-900 md:px-5 md:py-4"
                >
                  {item.q}
                  <motion.span
                    animate={{ rotate: openFaq === i ? 45 : 0 }}
                    className="ml-4 text-slate-400 text-xl font-light shrink-0 origin-center flex items-center justify-center"
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-5 text-sm text-slate-600 font-medium leading-relaxed -mt-1">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ACETERNITY AURORA BACKGROUND CTA */}
      <AuroraBackground>
        <motion.div
          initial={{ opacity: 0.0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="relative flex max-w-3xl flex-col items-center justify-center gap-5 px-4 text-center md:gap-6"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-xl md:text-6xl">
            Comece pequeno, mas com cara de produto sério.
          </h2>
          <p className="max-w-2xl py-2 text-base font-medium leading-7 text-slate-200 md:py-4 md:text-xl md:leading-relaxed">
            O primeiro cliente precisa sair com um orçamento aprovado e uma
            obra controlada. Depois disso, Pix direto, saldo e margem viram
            o centro do seu dia a dia.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-2 h-14 w-full max-w-[19rem] rounded-full bg-white px-8 text-base font-black text-[#059669] shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all duration-300 hover:scale-110 hover:bg-slate-50 hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] md:mt-4 md:w-auto md:px-10 md:text-lg"
          >
            <TrackedAnchor
              href="/signup"
              analyticsEvent="marketing_cta_clicked"
              analyticsProperties={{ source: "landing_final_cta", target: "signup" }}
            >
              Criar minha conta agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </TrackedAnchor>
          </Button>
        </motion.div>
      </AuroraBackground>

      <footer className="border-t border-slate-200 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm font-semibold text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Prumo. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <Link href="/precos" className="transition-colors hover:text-[#059669]">
              Preços
            </Link>
            <Link href="/termos" className="transition-colors hover:text-[#059669]">
              Termos
            </Link>
            <Link href="/privacidade" className="transition-colors hover:text-[#059669]">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Reason({ title, text, icon }: { title: string; text: string; icon: React.ReactNode }) {
  return (
    <motion.div 
      variants={fadeIn} 
      className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/40 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl sm:p-6"
    >
      <div className="absolute w-2 bg-gradient-to-b from-[#059669] to-[#10b981] inset-y-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-orange-100 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#059669] transition-colors">{title}</h3>
          <p className="mt-3 leading-relaxed text-slate-600 font-medium">{text}</p>
        </div>
      </div>
    </motion.div>
  );
}
