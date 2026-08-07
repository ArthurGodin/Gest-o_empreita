import type { BusinessSegment } from "@/lib/business-segment";

export const PUBLIC_DEMO_SECTIONS = [
  "overview",
  "quote",
  "project",
  "deliverables",
  "finance",
] as const;

export type PublicDemoSectionId = (typeof PUBLIC_DEMO_SECTIONS)[number];

export interface PublicDemoQuoteItem {
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
}

export interface PublicDemoStage {
  title: string;
  status: "completed" | "active" | "pending";
  progress: number;
  detail: string;
}

export interface PublicDemoDeliverable {
  title: string;
  version: string;
  status: "approved" | "review" | "draft";
  updatedLabel: string;
  note: string;
}

export interface PublicDemoCost {
  description: string;
  category: string;
  amountCents: number;
}

export interface PublicDemoContextItem {
  label: string;
  value: string;
}

export interface PublicDemoScenario {
  segment: BusinessSegment;
  segmentLabel: string;
  organizationLabel: string;
  organizationName: string;
  customerName: string;
  customerLabel: string;
  quoteLabel: string;
  quoteNumber: string;
  quoteTitle: string;
  quoteStatus: string;
  quoteValidUntil: string;
  quoteItems: readonly PublicDemoQuoteItem[];
  projectLabel: string;
  projectName: string;
  projectStatus: string;
  projectPeriod: string;
  projectProgress: number;
  nextMilestone: string;
  nextMilestoneDetail: string;
  contextLabel: string;
  contextDescription: string;
  contextItems: readonly PublicDemoContextItem[];
  stages: readonly PublicDemoStage[];
  deliverables: readonly PublicDemoDeliverable[];
  receivedCents: number;
  costs: readonly PublicDemoCost[];
}

const SCENARIOS: Record<BusinessSegment, PublicDemoScenario> = {
  architecture: {
    segment: "architecture",
    segmentLabel: "Arquitetura",
    organizationLabel: "Escritório",
    organizationName: "Linha Norte Arquitetura",
    customerName: "Cliente fictícia · Ana Ribeiro",
    customerLabel: "Residência Ana Ribeiro",
    quoteLabel: "Proposta",
    quoteNumber: "PROP-2026-014",
    quoteTitle: "Projeto arquitetônico residencial",
    quoteStatus: "Aprovada",
    quoteValidUntil: "18/08/2026",
    quoteItems: [
      { description: "Levantamento e briefing", quantity: 1, unit: "etapa", unitPriceCents: 320_000 },
      { description: "Estudo preliminar", quantity: 1, unit: "etapa", unitPriceCents: 580_000 },
      { description: "Anteprojeto", quantity: 1, unit: "etapa", unitPriceCents: 680_000 },
      { description: "Projeto executivo", quantity: 1, unit: "etapa", unitPriceCents: 900_000 },
    ],
    projectLabel: "Projeto",
    projectName: "Residência Ana Ribeiro",
    projectStatus: "Em desenvolvimento",
    projectPeriod: "05/06 a 28/10/2026",
    projectProgress: 58,
    nextMilestone: "Compatibilização do anteprojeto",
    nextMilestoneDetail: "Revisão prevista para 12/08, antes da publicação ao cliente.",
    contextLabel: "Briefing consolidado",
    contextDescription: "Decisões do cliente organizadas antes do desenvolvimento técnico.",
    contextItems: [
      { label: "Moradores", value: "Casal e uma criança" },
      { label: "Área estimada", value: "186 m²" },
      { label: "Prioridade", value: "Integração social e iluminação natural" },
      { label: "Ambientes", value: "12 cadastrados" },
    ],
    stages: [
      { title: "Levantamento", status: "completed", progress: 100, detail: "Medições e referências aprovadas." },
      { title: "Estudo preliminar", status: "completed", progress: 100, detail: "Partido arquitetônico validado." },
      { title: "Anteprojeto", status: "active", progress: 72, detail: "Compatibilização em andamento." },
      { title: "Projeto executivo", status: "pending", progress: 0, detail: "Inicia após aprovação do anteprojeto." },
    ],
    deliverables: [
      { title: "Estudo preliminar", version: "v3", status: "approved", updatedLabel: "Aprovado em 24/07", note: "Implantação e distribuição validadas pela cliente." },
      { title: "Anteprojeto", version: "v2", status: "review", updatedLabel: "Publicado em 05/08", note: "Aguardando retorno sobre a fachada posterior." },
      { title: "Caderno executivo", version: "v1", status: "draft", updatedLabel: "Atualizado hoje", note: "Em preparação interna, ainda não publicado." },
    ],
    receivedCents: 744_000,
    costs: [
      { description: "Levantamento terceirizado", category: "Serviço", amountCents: 145_000 },
      { description: "Impressões e apresentação", category: "Material", amountCents: 46_000 },
      { description: "Compatibilização estrutural", category: "Consultoria", amountCents: 165_000 },
    ],
  },
  interiors: {
    segment: "interiors",
    segmentLabel: "Design de interiores",
    organizationLabel: "Estúdio",
    organizationName: "Vértice Interiores",
    customerName: "Cliente fictícia · Beatriz Lima",
    customerLabel: "Apartamento Beatriz Lima",
    quoteLabel: "Proposta",
    quoteNumber: "PROP-2026-021",
    quoteTitle: "Interiores para apartamento de 96 m²",
    quoteStatus: "Aprovada",
    quoteValidUntil: "22/08/2026",
    quoteItems: [
      { description: "Briefing e levantamento", quantity: 1, unit: "etapa", unitPriceCents: 180_000 },
      { description: "Layout e conceito", quantity: 1, unit: "etapa", unitPriceCents: 360_000 },
      { description: "Imagens 3D", quantity: 1, unit: "pacote", unitPriceCents: 480_000 },
      { description: "Detalhamento executivo", quantity: 1, unit: "etapa", unitPriceCents: 540_000 },
      { description: "Curadoria de materiais", quantity: 1, unit: "serviço", unitPriceCents: 300_000 },
    ],
    projectLabel: "Projeto",
    projectName: "Apartamento Beatriz Lima",
    projectStatus: "Em apresentação",
    projectPeriod: "16/06 a 30/09/2026",
    projectProgress: 64,
    nextMilestone: "Aprovação da sala integrada",
    nextMilestoneDetail: "A cliente recebeu a segunda versão para análise.",
    contextLabel: "Programa de ambientes",
    contextDescription: "Necessidades e decisões de cada ambiente reunidas no projeto.",
    contextItems: [
      { label: "Estilo", value: "Contemporâneo leve" },
      { label: "Ambientes", value: "8 cadastrados" },
      { label: "Prioridade", value: "Sala, cozinha e suíte" },
      { label: "Orçamento de compras", value: "R$ 86 mil" },
    ],
    stages: [
      { title: "Briefing", status: "completed", progress: 100, detail: "Preferências e referências consolidadas." },
      { title: "Layout", status: "completed", progress: 100, detail: "Distribuição aprovada." },
      { title: "Apresentação 3D", status: "active", progress: 80, detail: "Sala em revisão com a cliente." },
      { title: "Detalhamento", status: "pending", progress: 12, detail: "Base técnica iniciada." },
    ],
    deliverables: [
      { title: "Layout geral", version: "v2", status: "approved", updatedLabel: "Aprovado em 29/07", note: "Circulação e mobiliário validados." },
      { title: "Sala integrada", version: "v2", status: "review", updatedLabel: "Publicado ontem", note: "Cliente avaliando acabamento do painel." },
      { title: "Caderno de materiais", version: "v1", status: "draft", updatedLabel: "Atualizado hoje", note: "Seleção interna em andamento." },
    ],
    receivedCents: 930_000,
    costs: [
      { description: "Renderização terceirizada", category: "Serviço", amountCents: 168_000 },
      { description: "Amostras de materiais", category: "Material", amountCents: 62_000 },
      { description: "Visitas a fornecedores", category: "Deslocamento", amountCents: 55_000 },
    ],
  },
  engineering: {
    segment: "engineering",
    segmentLabel: "Engenharia",
    organizationLabel: "Empresa",
    organizationName: "Eixo Engenharia",
    customerName: "Cliente fictício · Carlos Menezes",
    customerLabel: "Edifício Comercial Horizonte",
    quoteLabel: "Proposta",
    quoteNumber: "PROP-2026-009",
    quoteTitle: "Laudo e acompanhamento técnico",
    quoteStatus: "Aprovada",
    quoteValidUntil: "15/08/2026",
    quoteItems: [
      { description: "Vistoria e levantamento", quantity: 1, unit: "serviço", unitPriceCents: 250_000 },
      { description: "Laudo técnico", quantity: 1, unit: "documento", unitPriceCents: 640_000 },
      { description: "Acompanhamento de adequações", quantity: 4, unit: "visita", unitPriceCents: 100_000 },
    ],
    projectLabel: "Projeto",
    projectName: "Adequação técnica Horizonte",
    projectStatus: "Em acompanhamento",
    projectPeriod: "08/07 a 18/09/2026",
    projectProgress: 46,
    nextMilestone: "Publicação do laudo consolidado",
    nextMilestoneDetail: "Revisão técnica final programada para 14/08.",
    contextLabel: "Registros técnicos",
    contextDescription: "Achados, responsáveis e evidências preservados por etapa.",
    contextItems: [
      { label: "Vistorias", value: "3 registradas" },
      { label: "Pendências", value: "4 em acompanhamento" },
      { label: "Responsável", value: "Equipe técnica demonstrativa" },
      { label: "Próxima visita", value: "19/08/2026" },
    ],
    stages: [
      { title: "Inspeção inicial", status: "completed", progress: 100, detail: "Vistoria e evidências registradas." },
      { title: "Diagnóstico", status: "completed", progress: 100, detail: "Causas e prioridades definidas." },
      { title: "Laudo técnico", status: "active", progress: 68, detail: "Documento em revisão final." },
      { title: "Acompanhamento", status: "pending", progress: 18, detail: "Primeira adequação acompanhada." },
    ],
    deliverables: [
      { title: "Relatório de vistoria", version: "v1", status: "approved", updatedLabel: "Validado em 28/07", note: "Registro técnico aceito pelo cliente." },
      { title: "Laudo consolidado", version: "v2", status: "review", updatedLabel: "Publicado em 06/08", note: "Aguardando comentários finais." },
      { title: "Plano de adequações", version: "v1", status: "draft", updatedLabel: "Atualizado hoje", note: "Cronograma interno em preparação." },
    ],
    receivedCents: 645_000,
    costs: [
      { description: "Equipamentos de inspeção", category: "Equipamento", amountCents: 78_000 },
      { description: "Deslocamentos técnicos", category: "Deslocamento", amountCents: 52_000 },
      { description: "Consultoria complementar", category: "Consultoria", amountCents: 68_000 },
    ],
  },
  construction: {
    segment: "construction",
    segmentLabel: "Execução de obras",
    organizationLabel: "Empresa",
    organizationName: "Base Certa Reformas",
    customerName: "Cliente fictícia · Maria Santos",
    customerLabel: "Cobertura Maria Santos",
    quoteLabel: "Orçamento",
    quoteNumber: "ORC-2026-001",
    quoteTitle: "Cobertura colonial com calhas",
    quoteStatus: "Aprovado",
    quoteValidUntil: "27/08/2026",
    quoteItems: [
      { description: "Estrutura e madeiramento", quantity: 1, unit: "serviço", unitPriceCents: 648_000 },
      { description: "Telhas cerâmicas e cumeeiras", quantity: 1, unit: "material", unitPriceCents: 230_000 },
      { description: "Calhas e rufos", quantity: 1, unit: "serviço", unitPriceCents: 120_000 },
      { description: "Retirada e limpeza", quantity: 1, unit: "serviço", unitPriceCents: 80_000 },
    ],
    projectLabel: "Obra",
    projectName: "Execução da cobertura Maria Santos",
    projectStatus: "Em execução",
    projectPeriod: "29/07 a 30/08/2026",
    projectProgress: 41,
    nextMilestone: "Conclusão do madeiramento",
    nextMilestoneDetail: "Equipe prevista para finalizar a etapa em 11/08.",
    contextLabel: "Diário de obra",
    contextDescription: "Equipe, avanço e ocorrências registrados no contexto da obra.",
    contextItems: [
      { label: "Último registro", value: "Hoje, 08:10" },
      { label: "Equipe", value: "3 profissionais" },
      { label: "Clima", value: "Ensolarado" },
      { label: "Ocorrências", value: "Nenhuma pendência crítica" },
    ],
    stages: [
      { title: "Retirada da cobertura", status: "completed", progress: 100, detail: "Área liberada e resíduos retirados." },
      { title: "Madeiramento", status: "active", progress: 76, detail: "Tesouras instaladas, caibros em andamento." },
      { title: "Telhamento", status: "pending", progress: 8, detail: "Material conferido no local." },
      { title: "Calhas e acabamento", status: "pending", progress: 0, detail: "Programado após o telhamento." },
    ],
    deliverables: [
      { title: "Registro da retirada", version: "v1", status: "approved", updatedLabel: "Validado em 31/07", note: "Fotos e medição da etapa aceitas." },
      { title: "Avanço do madeiramento", version: "v2", status: "review", updatedLabel: "Publicado hoje", note: "Cliente recebeu o registro fotográfico." },
      { title: "Termo de conclusão", version: "v1", status: "draft", updatedLabel: "Modelo preparado", note: "Será publicado ao concluir a obra." },
    ],
    receivedCents: 323_400,
    costs: [
      { description: "Madeiramento e ferragens", category: "Material", amountCents: 238_000 },
      { description: "Telhas e cumeeiras", category: "Material", amountCents: 126_000 },
      { description: "Mão de obra acumulada", category: "Equipe", amountCents: 94_000 },
    ],
  },
};

export function normalizePublicDemoSegment(value: unknown): BusinessSegment {
  return value === "architecture" ||
    value === "interiors" ||
    value === "engineering" ||
    value === "construction"
    ? value
    : "architecture";
}

export function normalizePublicDemoSection(
  value: unknown,
): PublicDemoSectionId {
  return typeof value === "string" &&
    PUBLIC_DEMO_SECTIONS.includes(value as PublicDemoSectionId)
    ? (value as PublicDemoSectionId)
    : "overview";
}

export function getPublicDemoScenario(value: unknown): PublicDemoScenario {
  return SCENARIOS[normalizePublicDemoSegment(value)];
}

export function publicDemoQuoteTotal(scenario: PublicDemoScenario) {
  return scenario.quoteItems.reduce(
    (total, item) => total + item.quantity * item.unitPriceCents,
    0,
  );
}

export function publicDemoFinancials(scenario: PublicDemoScenario) {
  const contractedCents = publicDemoQuoteTotal(scenario);
  const costsCents = scenario.costs.reduce(
    (total, cost) => total + cost.amountCents,
    0,
  );
  const balanceCents = Math.max(0, contractedCents - scenario.receivedCents);
  const marginCents = contractedCents - costsCents;
  const marginPercent = contractedCents
    ? Math.round((marginCents / contractedCents) * 100)
    : 0;

  return {
    contractedCents,
    receivedCents: scenario.receivedCents,
    balanceCents,
    costsCents,
    marginCents,
    marginPercent,
  };
}

export function listPublicDemoScenarios() {
  return Object.values(SCENARIOS);
}

export function formatPublicDemoCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
