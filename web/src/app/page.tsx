"use client";

import Link from "next/link";
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
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  return (
    <main className="bg-slate-50 text-slate-900 overflow-x-hidden font-sans selection:bg-[#db5b18]/20 relative">
      
      {/* Background Glows e Pattern "SaaS Premium" */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Grid pattern suave */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60" />
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#db5b18]/15 blur-[120px]" />
        <div className="absolute right-0 top-[20%] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#db5b18] to-[#ea7a3e] text-white shadow-lg shadow-[#db5b18]/20">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="text-lg tracking-tight">Gestão Empreita</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full hover:bg-slate-100 font-medium">
              <Link href="/precos">Preços</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-full hover:bg-slate-100 font-medium">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-[#db5b18] hover:bg-[#bc4810] shadow-md shadow-[#db5b18]/20 transition-all hover:shadow-lg hover:shadow-[#db5b18]/30 font-bold">
              <Link href="/signup">Começar grátis</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* ACETERNITY HERO SCROLL ANIMATION */}
      <section className="relative z-10 w-full overflow-hidden pt-24 pb-12">
        <ContainerScroll
          titleComponent={
            <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col items-center pb-8">
              <motion.div variants={fadeIn} className="inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-orange-50/80 px-4 py-1.5 text-sm font-semibold text-[#9a3412] backdrop-blur-md shadow-sm mb-6">
                <ShieldCheck className="h-4 w-4" />
                Venda e controle obras sem planilhas
              </motion.div>
              
              <motion.h1 variants={fadeIn} className="max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight md:text-7xl">
                Orçamento <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#db5b18] to-[#f47721]">bonito</span>,<br/>obra no controle.
              </motion.h1>
              
              <motion.p variants={fadeIn} className="mt-6 max-w-2xl mx-auto text-lg md:text-xl leading-relaxed text-slate-600 font-medium">
                O software elegante para pequenas empreiteiras. Crie orçamentos profissionais, receba aprovação digital do cliente e acompanhe tudo no seu celular.
              </motion.p>

              <motion.div variants={fadeIn} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-14 rounded-full bg-[#db5b18] px-8 text-base font-bold shadow-xl shadow-[#db5b18]/20 transition-all hover:scale-105 hover:bg-[#bc4810]"
                >
                  <Link href="/signup">
                    Testar por 14 dias
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </motion.div>

              {/* Social Proof Avatar Group */}
              <motion.div variants={fadeIn} className="mt-12 flex flex-col items-center gap-3">
                <div className="flex -space-x-3">
                  <div className="h-10 w-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden"><img src="https://i.pravatar.cc/100?img=11" alt="User" /></div>
                  <div className="h-10 w-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden"><img src="https://i.pravatar.cc/100?img=33" alt="User" /></div>
                  <div className="h-10 w-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden"><img src="https://i.pravatar.cc/100?img=15" alt="User" /></div>
                  <div className="h-10 w-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden"><img src="https://i.pravatar.cc/100?img=44" alt="User" /></div>
                  <div className="h-10 w-10 rounded-full border-2 border-white bg-slate-800 flex items-center justify-center text-xs font-bold text-white shadow-sm">+50</div>
                </div>
                <p className="text-sm font-semibold text-slate-500">
                  Usado por dezenas de empreiteiros que abandonaram as planilhas.
                </p>
              </motion.div>
            </motion.div>
          }
        >
          <img
            src="/dashboard-mockup.png"
            alt="Dashboard Gestão Empreita"
            className="w-full h-full object-cover object-left-top shadow-2xl rounded-[1.5rem]"
            draggable={false}
          />
        </ContainerScroll>
      </section>

      {/* SEÇÃO BENTO GRID */}
      <section className="relative z-10 border-y border-slate-200/50 bg-white backdrop-blur-md shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-6xl px-4 py-24 md:py-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              Tudo que a sua empreiteira precisa.
            </h2>
            <p className="mt-4 text-lg font-medium text-slate-500">
              Desenhado para ser simples, poderoso e impressionar o cliente final.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
            {/* Bento Item 1 - Grande */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="md:col-span-2 md:row-span-2 rounded-3xl bg-slate-50 p-8 md:p-10 border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300"
            >
              <div className="absolute right-0 top-0 w-64 h-64 bg-[#db5b18]/10 rounded-full blur-3xl group-hover:bg-[#db5b18]/20 transition-colors" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-[#db5b18] mb-6 shadow-sm">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Orçamentos que vendem.</h3>
                  <p className="mt-3 text-slate-600 max-w-md leading-relaxed font-medium">
                    Diga adeus às planilhas confusas. Crie orçamentos elegantes em minutos, adicione sua margem invisível e envie o link para aprovação digital.
                  </p>
                </div>
                
                {/* Mini-UI interativa */}
                <div className="mt-8 flex-1 rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xl p-5 translate-y-4 group-hover:-translate-y-0 transition-transform duration-500 max-w-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gradient-to-br from-[#db5b18] to-[#ea7a3e] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                        GE
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">Reforma Cozinha</div>
                        <div className="text-[10px] text-slate-500 font-medium">Para: Maria Santos</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total</div>
                      <div className="text-xl font-black text-[#db5b18]">R$ 14.500</div>
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
              className="rounded-3xl bg-slate-900 p-8 border border-slate-800 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all duration-300 text-white flex flex-col justify-between"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mb-6">
                  <LineChart className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Margem na mão</h3>
                <p className="mt-2 text-slate-400 text-sm font-medium leading-relaxed">
                  Saiba exatamente quanto de lucro cada obra está deixando. Controle o previsto vs realizado.
                </p>
              </div>

              {/* Mini-UI Chart */}
              <div className="relative z-10 mt-6 bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4 translate-y-4 group-hover:-translate-y-0 transition-transform duration-500 shadow-2xl">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Lucro Estimado</div>
                    <div className="text-3xl font-black text-emerald-400">28.5%</div>
                  </div>
                  <div className="h-6 px-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +4.2%
                  </div>
                </div>
                <div className="h-16 w-full flex items-end gap-1.5 opacity-90">
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
              className="rounded-3xl bg-white p-8 pb-0 border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-6 shadow-sm border border-blue-100/50">
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
      <section className="relative z-10 py-24 md:py-32 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm mb-6">
              <ArrowRight className="h-4 w-4 text-[#db5b18]" /> 4 passos para receber
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              Do orçamento ao <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#db5b18] to-[#f47721]">Pix na conta.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {workflow.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group relative text-center"
              >
                {/* Connector line */}
                {i < workflow.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-slate-200 to-slate-100" />
                )}
                <div className="relative z-10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white border-2 border-slate-100 shadow-lg group-hover:shadow-xl group-hover:border-[#db5b18]/30 group-hover:scale-110 transition-all duration-300">
                  <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-[#db5b18] text-white text-xs font-black flex items-center justify-center shadow-md">{i + 1}</span>
                  <step.icon className="h-8 w-8 text-slate-600 group-hover:text-[#db5b18] transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-500 font-medium leading-relaxed max-w-[220px] mx-auto">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO: O PRODUTO COMEÇA ONDE DÓI */}
      <section className="mx-auto max-w-6xl px-4 py-24 md:py-32">
        <div className="text-center mb-20">
          <HeroHighlight>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: [20, -5, 0] }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
              className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-snug tracking-tight"
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
              icon={<FileText className="h-5 w-5 text-[#db5b18]" />}
            />
            <Reason
              title="Menos surpresa no fim da obra"
              text="Fotos, diário, ponto e gastos ficam presos à obra. O dono consegue cobrar decisões com contexto direto do canteiro."
              icon={<HardHat className="h-5 w-5 text-[#db5b18]" />}
            />
            <Reason
              title="Recebimento com Pix Automático"
              text="A tela financeira mostra aprovado, pendente, e o gasto. A cobrança via Pix vai direto pra conta e cai no extrato."
              icon={<LineChart className="h-5 w-5 text-[#db5b18]" />}
            />
          </div>

          {/* Showcase Flutuante Impactante */}
          <div className="relative h-[400px] md:h-[550px] w-full perspective-1000">
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
              <img src="/dashboard-mockup.png" alt="Dashboard" className="w-full h-full object-cover object-left-top select-none pointer-events-none opacity-95" draggable={false} />
            </motion.div>

            {/* Elemento frontal flutuante: Orçamento */}
            <motion.div
              animate={{ y: [15, -15, 15], rotateZ: [-2, 1, -2] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-4 left-0 w-[65%] h-[80%] rounded-2xl overflow-hidden shadow-[0_30px_80px_-15px_rgba(0,0,0,0.4)] border-2 border-white bg-white"
            >
               <img src="/quote-mockup.png" alt="Quote" className="w-full h-full object-cover object-top select-none pointer-events-none" draggable={false} />
            </motion.div>

            {/* Selo de Destaque Flutuante */}
            <motion.div
              animate={{ y: [-5, 5, -5], scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute top-[55%] -right-4 md:-right-8 bg-slate-900 text-white p-4 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] flex items-center gap-3 border border-slate-700/80 backdrop-blur-xl"
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

      {/* SEÇÃO: DEPOIMENTOS */}
      <section className="relative z-10 border-y border-slate-200/50 bg-white py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              Quem usa, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#db5b18] to-[#f47721]">recomenda.</span>
            </h2>
            <p className="mt-4 text-lg font-medium text-slate-500">Empreiteiros reais que transformaram a forma de vender e controlar obras.</p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { name: "Carlos Mendes", role: "Mendes Reformas — SP", text: "Antes eu mandava orçamento por WhatsApp e o cliente sumia. Agora mando o link, ele aprova no celular, e já vira obra no sistema. Profissionalizou meu negócio." },
              { name: "Ana Oliveira", role: "AO Construções — MG", text: "A margem que eu achava que tinha nunca batia. Com o Gestão Empreita eu vejo o gasto real de cada obra e sei exatamente quanto sobrou. Mudou tudo." },
              { name: "Roberto Silva", role: "Silva Coberturas — PI", text: "Meu cliente recebe um link bonito, com PDF, aprovação digital. Ele me disse que parece empresa grande. Isso faz diferença na hora de fechar." },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-3xl border border-slate-200/60 bg-slate-50 p-8 shadow-sm hover:shadow-xl hover:bg-white transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-6 right-6 text-6xl font-black text-slate-100 leading-none select-none group-hover:text-[#db5b18]/10 transition-colors">&ldquo;</div>
                <p className="relative z-10 text-slate-600 font-medium leading-relaxed italic">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#db5b18] to-[#ea7a3e] flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {t.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO: FAQ */}
      <section className="py-24 md:py-32 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">Dúvidas frequentes</h2>
            <p className="mt-4 text-lg font-medium text-slate-500">Tudo que você precisa saber antes de começar.</p>
          </motion.div>

          <div className="space-y-4">
            {[
              { q: "Preciso instalar alguma coisa?", a: "Não. O Gestão Empreita funciona 100% no navegador, no celular ou no computador. Basta criar a conta e começar." },
              { q: "Meu cliente precisa criar conta para aprovar?", a: "Não. Ele recebe um link único e privado. Abre no celular, vê o orçamento completo e aprova com um clique." },
              { q: "Como funciona o Pix?", a: "Você cadastra sua chave Pix nas configurações. O sistema gera QR Code automático nas cobranças. O pagamento cai direto na sua conta." },
              { q: "E se eu quiser cancelar?", a: "Sem multa, sem fidelidade. Você cancela a qualquer momento direto nas configurações da conta." },
              { q: "Tem período de teste?", a: "Sim! 14 dias grátis sem precisar de cartão. Você testa tudo e só paga se gostar." },
              { q: "Funciona para qualquer tipo de obra?", a: "Sim. Reformas, coberturas, acabamentos, pintura, elétrica — qualquer serviço de empreitada. Você personaliza os itens do seu catálogo." },
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
                  className="w-full text-left cursor-pointer px-6 py-5 text-base font-bold text-slate-900 flex items-center justify-between select-none"
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
          className="relative flex flex-col gap-6 items-center justify-center px-4 max-w-3xl text-center"
        >
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-xl">
            Comece pequeno, mas com cara de produto sério.
          </h2>
          <p className="font-medium text-lg md:text-xl text-slate-200 py-4 max-w-2xl leading-relaxed">
            O primeiro cliente precisa sair com um orçamento aprovado e uma
            obra controlada. Depois disso, Pix direto, saldo e margem viram
            o centro do seu dia a dia.
          </p>
          <Button
            asChild
            size="lg"
            className="h-14 mt-4 rounded-full bg-white px-10 text-lg font-black text-[#db5b18] transition-all duration-300 hover:scale-110 hover:bg-slate-50 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
          >
            <Link href="/signup">
              Criar minha conta agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.div>
      </AuroraBackground>

      <footer className="border-t border-slate-200 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm font-semibold text-slate-400 md:flex-row md:items-center md:justify-between">
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

function Reason({ title, text, icon }: { title: string; text: string; icon: React.ReactNode }) {
  return (
    <motion.div 
      variants={fadeIn} 
      className="group relative rounded-3xl border border-slate-200/60 bg-white/40 backdrop-blur-md p-6 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-2xl hover:bg-white hover:-translate-y-1 overflow-hidden cursor-default"
    >
      <div className="absolute w-2 bg-gradient-to-b from-[#db5b18] to-[#ea7a3e] inset-y-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#db5b18] transition-colors">{title}</h3>
          <p className="mt-3 leading-relaxed text-slate-600 font-medium">{text}</p>
        </div>
      </div>
    </motion.div>
  );
}
