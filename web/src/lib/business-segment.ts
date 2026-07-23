export const BUSINESS_SEGMENTS = [
  "architecture",
  "interiors",
  "engineering",
  "construction",
] as const;

export type BusinessSegment = (typeof BUSINESS_SEGMENTS)[number];

export interface BusinessSegmentOption {
  value: BusinessSegment;
  label: string;
  shortLabel: string;
  description: string;
}

export const BUSINESS_SEGMENT_OPTIONS: readonly BusinessSegmentOption[] = [
  {
    value: "architecture",
    label: "Arquitetura",
    shortLabel: "Arquitetura",
    description: "Projetos, propostas e acompanhamento de entregas.",
  },
  {
    value: "interiors",
    label: "Design de interiores",
    shortLabel: "Interiores",
    description: "Ambientes, especificações e atendimento ao cliente.",
  },
  {
    value: "engineering",
    label: "Engenharia",
    shortLabel: "Engenharia",
    description: "Projetos técnicos, laudos e acompanhamento.",
  },
  {
    value: "construction",
    label: "Execução de obras",
    shortLabel: "Obras",
    description: "Orçamentos, execução, custos e cobranças.",
  },
] as const;

export interface BusinessVocabulary {
  organizationLabel: string;
  appDescriptor: string;
  quoteSingular: string;
  quotePlural: string;
  quotePluralLower: string;
  newQuoteLabel: string;
  createQuoteLabel: string;
  projectSingular: string;
  projectPlural: string;
  projectPluralLower: string;
  createProjectLabel: string;
  diaryLabel: string;
}

const PROFESSIONAL_VOCABULARY: BusinessVocabulary = {
  organizationLabel: "Escritório",
  appDescriptor: "Gestão de projetos",
  quoteSingular: "Proposta",
  quotePlural: "Propostas",
  quotePluralLower: "propostas",
  newQuoteLabel: "Nova proposta",
  createQuoteLabel: "Criar proposta",
  projectSingular: "Projeto",
  projectPlural: "Projetos",
  projectPluralLower: "projetos",
  createProjectLabel: "Criar projeto",
  diaryLabel: "Diário do projeto",
};

const VOCABULARY_BY_SEGMENT: Record<BusinessSegment, BusinessVocabulary> = {
  architecture: PROFESSIONAL_VOCABULARY,
  interiors: {
    ...PROFESSIONAL_VOCABULARY,
    appDescriptor: "Projetos de interiores",
  },
  engineering: {
    ...PROFESSIONAL_VOCABULARY,
    organizationLabel: "Empresa",
    appDescriptor: "Gestão de engenharia",
  },
  construction: {
    organizationLabel: "Empresa",
    appDescriptor: "Gestão de obras",
    quoteSingular: "Orçamento",
    quotePlural: "Orçamentos",
    quotePluralLower: "orçamentos",
    newQuoteLabel: "Novo orçamento",
    createQuoteLabel: "Criar orçamento",
    projectSingular: "Obra",
    projectPlural: "Obras",
    projectPluralLower: "obras",
    createProjectLabel: "Virar obra",
    diaryLabel: "Diário de obra",
  },
};

export function isBusinessSegment(value: unknown): value is BusinessSegment {
  return (
    typeof value === "string" &&
    BUSINESS_SEGMENTS.includes(value as BusinessSegment)
  );
}

export function normalizeBusinessSegment(
  value: unknown,
): BusinessSegment {
  return isBusinessSegment(value) ? value : "construction";
}

export function getBusinessSegmentOption(segment: BusinessSegment) {
  return BUSINESS_SEGMENT_OPTIONS.find((option) => option.value === segment)!;
}

export function getBusinessVocabulary(
  value: unknown,
): BusinessVocabulary {
  return VOCABULARY_BY_SEGMENT[normalizeBusinessSegment(value)];
}

export function isProfessionalSegment(value: unknown) {
  return normalizeBusinessSegment(value) !== "construction";
}
