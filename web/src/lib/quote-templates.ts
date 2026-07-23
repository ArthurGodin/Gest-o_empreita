import {
  normalizeBusinessSegment,
  type BusinessSegment,
} from "@/lib/business-segment";

export interface QuoteTemplateItem {
  description: string;
  unit: string;
  quantity: number;
}

export interface QuoteTemplate {
  id: string;
  segment: BusinessSegment;
  name: string;
  summary: string;
  title: string;
  description: string;
  notes: string;
  validDays: number;
  items: readonly QuoteTemplateItem[];
}

const REVIEW_NOTE =
  "Revise escopo, entregáveis, prazos, quantidades e valores antes de enviar. Serviços fora desta proposta devem ser combinados por escrito.";

export const QUOTE_TEMPLATES: readonly QuoteTemplate[] = [
  {
    id: "architecture-residential",
    segment: "architecture",
    name: "Projeto arquitetônico residencial",
    summary: "Do levantamento ao projeto executivo.",
    title: "Projeto arquitetônico residencial",
    description:
      "Desenvolvimento de projeto arquitetônico residencial conforme as etapas e entregáveis descritos nesta proposta.",
    notes:
      "Taxas, aprovações públicas, projetos complementares e execução da obra não estão incluídos, salvo quando descritos nos itens. " +
      REVIEW_NOTE,
    validDays: 15,
    items: [
      { description: "Briefing e levantamento inicial", unit: "etapa", quantity: 1 },
      { description: "Estudo preliminar", unit: "etapa", quantity: 1 },
      { description: "Anteprojeto arquitetônico", unit: "etapa", quantity: 1 },
      { description: "Projeto legal para protocolo", unit: "etapa", quantity: 1 },
      { description: "Projeto executivo arquitetônico", unit: "etapa", quantity: 1 },
    ],
  },
  {
    id: "architecture-renovation",
    segment: "architecture",
    name: "Reforma e interiores",
    summary: "Diagnóstico, layout e detalhamento da reforma.",
    title: "Projeto de reforma e interiores",
    description:
      "Projeto para reorganização e renovação dos ambientes definidos com o cliente.",
    notes:
      "Compatibilizações, aprovações condominiais e visitas adicionais precisam estar descritas para serem consideradas incluídas. " +
      REVIEW_NOTE,
    validDays: 15,
    items: [
      { description: "Levantamento do imóvel existente", unit: "etapa", quantity: 1 },
      { description: "Estudo de layout", unit: "etapa", quantity: 1 },
      { description: "Conceito e especificação de materiais", unit: "etapa", quantity: 1 },
      { description: "Detalhamento executivo da reforma", unit: "etapa", quantity: 1 },
      { description: "Reunião de entrega do projeto", unit: "etapa", quantity: 1 },
    ],
  },
  {
    id: "architecture-regularization",
    segment: "architecture",
    name: "Regularização e aprovação",
    summary: "Documentação técnica e acompanhamento de protocolo.",
    title: "Regularização de imóvel",
    description:
      "Preparação técnica para regularização do imóvel perante o órgão responsável.",
    notes:
      "A contratação não garante deferimento pelo órgão público. Taxas, certidões, levantamentos especiais e adequações físicas não estão incluídos sem descrição expressa. " +
      REVIEW_NOTE,
    validDays: 10,
    items: [
      { description: "Análise documental inicial", unit: "etapa", quantity: 1 },
      { description: "Levantamento cadastral do imóvel", unit: "etapa", quantity: 1 },
      { description: "Elaboração das peças técnicas", unit: "etapa", quantity: 1 },
      { description: "Preparação e protocolo do processo", unit: "etapa", quantity: 1 },
      { description: "Acompanhamento técnico do protocolo", unit: "serviço", quantity: 1 },
    ],
  },
  {
    id: "interiors-residential",
    segment: "interiors",
    name: "Projeto de interiores residencial",
    summary: "Conceito, layout e detalhamentos dos ambientes.",
    title: "Projeto de interiores residencial",
    description:
      "Desenvolvimento do projeto de interiores para os ambientes definidos no briefing.",
    notes:
      "Compras, fretes, montagem e execução não estão incluídos, salvo quando descritos nos itens. Imagens e referências são direcionais e dependem da disponibilidade dos produtos. " +
      REVIEW_NOTE,
    validDays: 15,
    items: [
      { description: "Briefing e medição dos ambientes", unit: "etapa", quantity: 1 },
      { description: "Layout e conceito visual", unit: "etapa", quantity: 1 },
      { description: "Seleção de materiais, cores e acabamentos", unit: "etapa", quantity: 1 },
      { description: "Detalhamento de mobiliário e marcenaria", unit: "etapa", quantity: 1 },
      { description: "Caderno final de especificações", unit: "etapa", quantity: 1 },
    ],
  },
  {
    id: "interiors-consulting",
    segment: "interiors",
    name: "Consultoria de ambiente",
    summary: "Orientação objetiva para um ambiente específico.",
    title: "Consultoria de interiores",
    description:
      "Consultoria para orientar layout, escolhas estéticas e próximos passos do ambiente definido.",
    notes:
      "A consultoria não inclui projeto executivo, gerenciamento de compras ou acompanhamento de execução, salvo quando descrito. " +
      REVIEW_NOTE,
    validDays: 10,
    items: [
      { description: "Reunião de briefing", unit: "reunião", quantity: 1 },
      { description: "Análise do ambiente e recomendações", unit: "serviço", quantity: 1 },
      { description: "Painel de referências e paleta", unit: "entrega", quantity: 1 },
      { description: "Lista orientativa de produtos", unit: "entrega", quantity: 1 },
      { description: "Reunião de apresentação", unit: "reunião", quantity: 1 },
    ],
  },
  {
    id: "interiors-commercial",
    segment: "interiors",
    name: "Projeto comercial compacto",
    summary: "Experiência, layout e especificação para pequenos negócios.",
    title: "Projeto de interiores comercial",
    description:
      "Projeto de interiores para qualificar a operação e a experiência do espaço comercial.",
    notes:
      "Projetos legais, complementares, comunicação visual, execução e aprovações específicas não estão incluídos sem descrição expressa. " +
      REVIEW_NOTE,
    validDays: 15,
    items: [
      { description: "Briefing da operação e levantamento", unit: "etapa", quantity: 1 },
      { description: "Estudo de fluxo e layout", unit: "etapa", quantity: 1 },
      { description: "Conceito visual do espaço", unit: "etapa", quantity: 1 },
      { description: "Detalhamento e especificações", unit: "etapa", quantity: 1 },
      { description: "Apresentação e entrega final", unit: "etapa", quantity: 1 },
    ],
  },
  {
    id: "engineering-structural",
    segment: "engineering",
    name: "Projeto estrutural",
    summary: "Dimensionamento, detalhamento e documentação técnica.",
    title: "Projeto estrutural",
    description:
      "Desenvolvimento do projeto estrutural conforme informações e documentos fornecidos para a edificação.",
    notes:
      "Sondagem, levantamento topográfico, projetos complementares, taxas e execução não estão incluídos sem descrição expressa. " +
      REVIEW_NOTE,
    validDays: 15,
    items: [
      { description: "Análise das informações de entrada", unit: "etapa", quantity: 1 },
      { description: "Concepção e pré-dimensionamento", unit: "etapa", quantity: 1 },
      { description: "Cálculo e dimensionamento estrutural", unit: "etapa", quantity: 1 },
      { description: "Detalhamento executivo", unit: "etapa", quantity: 1 },
      { description: "Memorial e entrega técnica", unit: "etapa", quantity: 1 },
    ],
  },
  {
    id: "engineering-inspection",
    segment: "engineering",
    name: "Laudo ou vistoria técnica",
    summary: "Inspeção, registro e conclusão técnica delimitada.",
    title: "Vistoria e laudo técnico",
    description:
      "Inspeção técnica do objeto definido e emissão de documento com registros, análise e recomendações.",
    notes:
      "Ensaios laboratoriais, abertura de elementos, projetos de correção e execução não estão incluídos sem descrição expressa. O diagnóstico é limitado às condições acessíveis na vistoria. " +
      REVIEW_NOTE,
    validDays: 10,
    items: [
      { description: "Análise inicial da solicitação", unit: "etapa", quantity: 1 },
      { description: "Vistoria técnica no local", unit: "visita", quantity: 1 },
      { description: "Registro e análise das evidências", unit: "etapa", quantity: 1 },
      { description: "Elaboração do laudo técnico", unit: "entrega", quantity: 1 },
      { description: "Apresentação das recomendações", unit: "reunião", quantity: 1 },
    ],
  },
  {
    id: "engineering-supervision",
    segment: "engineering",
    name: "Acompanhamento técnico",
    summary: "Visitas, registros e orientação durante a execução.",
    title: "Acompanhamento técnico de execução",
    description:
      "Acompanhamento técnico periódico da execução conforme frequência e escopo definidos nesta proposta.",
    notes:
      "O acompanhamento não substitui a responsabilidade dos executores e fornecedores. Quantidade de visitas, relatórios e disponibilidade devem ser confirmadas. " +
      REVIEW_NOTE,
    validDays: 10,
    items: [
      { description: "Reunião inicial e análise dos projetos", unit: "etapa", quantity: 1 },
      { description: "Visita técnica de acompanhamento", unit: "visita", quantity: 1 },
      { description: "Relatório de visita", unit: "relatório", quantity: 1 },
      { description: "Reunião de alinhamento técnico", unit: "reunião", quantity: 1 },
      { description: "Relatório final de acompanhamento", unit: "entrega", quantity: 1 },
    ],
  },
  {
    id: "construction-roof",
    segment: "construction",
    name: "Cobertura e telhado",
    summary: "Levantamento, execução e entrega da cobertura.",
    title: "Execução de cobertura",
    description:
      "Fornecimento dos serviços descritos para execução ou recuperação da cobertura.",
    notes:
      "Materiais, descarte, andaimes, içamento e reparos estruturais só estão incluídos quando descritos nos itens. " +
      REVIEW_NOTE,
    validDays: 15,
    items: [
      { description: "Visita técnica e levantamento", unit: "serviço", quantity: 1 },
      { description: "Preparação e proteção da área", unit: "serviço", quantity: 1 },
      { description: "Serviços de estrutura da cobertura", unit: "serviço", quantity: 1 },
      { description: "Instalação de telhas, calhas e rufos", unit: "serviço", quantity: 1 },
      { description: "Limpeza e entrega", unit: "serviço", quantity: 1 },
    ],
  },
  {
    id: "construction-renovation",
    segment: "construction",
    name: "Reforma residencial",
    summary: "Estrutura inicial para organizar serviços da reforma.",
    title: "Reforma residencial",
    description:
      "Execução dos serviços de reforma definidos e quantificados nesta proposta.",
    notes:
      "Serviços ocultos identificados após demolições, projetos, taxas, móveis e materiais não descritos exigem aprovação adicional. " +
      REVIEW_NOTE,
    validDays: 15,
    items: [
      { description: "Mobilização e proteção dos ambientes", unit: "serviço", quantity: 1 },
      { description: "Demolições e retiradas previstas", unit: "serviço", quantity: 1 },
      { description: "Adequações de instalações", unit: "serviço", quantity: 1 },
      { description: "Revestimentos e acabamentos", unit: "serviço", quantity: 1 },
      { description: "Pintura, limpeza e entrega", unit: "serviço", quantity: 1 },
    ],
  },
  {
    id: "construction-maintenance",
    segment: "construction",
    name: "Manutenção e reparos",
    summary: "Diagnóstico, correção e finalização de reparos.",
    title: "Manutenção e reparos",
    description:
      "Execução dos reparos e serviços de manutenção identificados na vistoria.",
    notes:
      "A proposta considera apenas as condições visíveis na vistoria. Novas causas ou danos encontrados durante o serviço serão apresentados antes da execução. " +
      REVIEW_NOTE,
    validDays: 10,
    items: [
      { description: "Vistoria e diagnóstico", unit: "serviço", quantity: 1 },
      { description: "Preparação da área", unit: "serviço", quantity: 1 },
      { description: "Execução dos reparos descritos", unit: "serviço", quantity: 1 },
      { description: "Teste e conferência", unit: "serviço", quantity: 1 },
      { description: "Limpeza e entrega", unit: "serviço", quantity: 1 },
    ],
  },
] as const;

export function getQuoteTemplatesForSegment(value: unknown) {
  const segment = normalizeBusinessSegment(value);
  return QUOTE_TEMPLATES.filter((template) => template.segment === segment);
}

export function getQuoteTemplate(
  templateId: unknown,
  segment: unknown,
): QuoteTemplate | null {
  if (typeof templateId !== "string" || !templateId) return null;
  const normalizedSegment = normalizeBusinessSegment(segment);
  return (
    QUOTE_TEMPLATES.find(
      (template) =>
        template.id === templateId && template.segment === normalizedSegment,
    ) ?? null
  );
}

export function quoteTemplateItemsPayload(template: QuoteTemplate) {
  return template.items.map((item, position) => ({
    position,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unit_price_cents: 0,
    total_cents: 0,
  }));
}
