import type { BusinessSegment } from "@/lib/business-segment";

export const BRIEFING_QUESTION_KINDS = [
  "short_text",
  "long_text",
  "single_choice",
  "multi_choice",
  "boolean",
  "number",
  "currency",
  "date",
  "priority",
] as const;

export type BriefingQuestionKind =
  (typeof BRIEFING_QUESTION_KINDS)[number];

export type BriefingAnswer = string | string[] | number | boolean | null;
export type BriefingAnswers = Record<string, BriefingAnswer>;

export interface BriefingQuestionOption {
  value: string;
  label: string;
  spaceType?: string;
}

export interface BriefingQuestion {
  id: string;
  kind: BriefingQuestionKind;
  label: string;
  description?: string;
  required: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: readonly BriefingQuestionOption[];
  spaceSource?: boolean;
}

export interface BriefingSection {
  id: string;
  title: string;
  description: string;
  questions: readonly BriefingQuestion[];
}

export interface BriefingTemplateSnapshot {
  key: string;
  name: string;
  description: string;
  segment: "architecture" | "interiors";
  version: number;
  sections: readonly BriefingSection[];
}

export interface BriefingTemplateSummary {
  key: string;
  name: string;
  description: string;
  segment: "architecture" | "interiors";
  version: number;
  sectionCount: number;
  questionCount: number;
}

export interface BriefingValidationSuccess {
  ok: true;
  answers: BriefingAnswers;
  missingRequired: string[];
}

export interface BriefingValidationFailure {
  ok: false;
  error: string;
  fieldErrors: Record<string, string>;
  missingRequired: string[];
}

export type BriefingAnswersValidation =
  | BriefingValidationSuccess
  | BriefingValidationFailure;

export interface SuggestedProjectSpace {
  name: string;
  spaceType: string;
  sourceQuestionId: string;
}

export interface ExistingProjectSpaceSummary {
  name: string;
  spaceType: string;
}

const SPACE_OPTIONS_RESIDENTIAL: readonly BriefingQuestionOption[] = [
  { value: "entrada", label: "Hall ou entrada", spaceType: "entrance" },
  { value: "sala_estar", label: "Sala de estar", spaceType: "living" },
  { value: "sala_jantar", label: "Sala de jantar", spaceType: "dining" },
  { value: "cozinha", label: "Cozinha", spaceType: "kitchen" },
  { value: "lavanderia", label: "Lavanderia", spaceType: "laundry" },
  { value: "suite", label: "Suíte", spaceType: "suite" },
  { value: "quarto", label: "Quarto", spaceType: "bedroom" },
  { value: "banheiro", label: "Banheiro", spaceType: "bathroom" },
  { value: "escritorio", label: "Escritório", spaceType: "office" },
  { value: "varanda", label: "Varanda", spaceType: "balcony" },
  { value: "garagem", label: "Garagem", spaceType: "garage" },
  { value: "jardim", label: "Jardim", spaceType: "garden" },
  { value: "lazer", label: "Área de lazer", spaceType: "leisure" },
  { value: "deposito", label: "Depósito", spaceType: "storage" },
] as const;

const SPACE_OPTIONS_COMMERCIAL: readonly BriefingQuestionOption[] = [
  { value: "recepcao", label: "Recepção", spaceType: "reception" },
  { value: "atendimento", label: "Atendimento", spaceType: "service" },
  { value: "vendas", label: "Área de vendas", spaceType: "sales" },
  { value: "trabalho", label: "Área de trabalho", spaceType: "workspace" },
  { value: "reuniao", label: "Sala de reunião", spaceType: "meeting" },
  { value: "estoque", label: "Estoque", spaceType: "stock" },
  { value: "deposito", label: "Depósito", spaceType: "storage" },
  { value: "copa", label: "Copa", spaceType: "pantry" },
  { value: "banheiro", label: "Banheiro", spaceType: "bathroom" },
  { value: "apoio", label: "Área de apoio", spaceType: "support" },
] as const;

const STYLE_OPTIONS: readonly BriefingQuestionOption[] = [
  { value: "contemporaneo", label: "Contemporâneo" },
  { value: "minimalista", label: "Minimalista" },
  { value: "classico", label: "Clássico" },
  { value: "industrial", label: "Industrial" },
  { value: "natural", label: "Natural e acolhedor" },
  { value: "brasileiro", label: "Brasileiro" },
  { value: "sem_definicao", label: "Ainda não sei definir" },
] as const;

const INVESTMENT_OPTIONS: readonly BriefingQuestionOption[] = [
  { value: "ate_50", label: "Até R$ 50 mil" },
  { value: "50_100", label: "De R$ 50 mil a R$ 100 mil" },
  { value: "100_250", label: "De R$ 100 mil a R$ 250 mil" },
  { value: "250_500", label: "De R$ 250 mil a R$ 500 mil" },
  { value: "acima_500", label: "Acima de R$ 500 mil" },
  { value: "definir", label: "Quero definir com o profissional" },
] as const;

export const BRIEFING_TEMPLATES: readonly BriefingTemplateSnapshot[] = [
  {
    key: "architecture-residential-v1",
    name: "Projeto arquitetônico residencial",
    description:
      "Programa, rotina, prioridades e limites para uma residência nova ou reforma.",
    segment: "architecture",
    version: 1,
    sections: [
      {
        id: "project",
        title: "Sobre o projeto",
        description: "Contexto inicial e resultado esperado.",
        questions: [
          {
            id: "project_goal",
            kind: "long_text",
            label: "O que você espera transformar com este projeto?",
            required: true,
            maxLength: 1500,
          },
          {
            id: "project_scope",
            kind: "single_choice",
            label: "Qual é o tipo de intervenção?",
            required: true,
            options: [
              { value: "new", label: "Construção nova" },
              { value: "renovation", label: "Reforma" },
              { value: "expansion", label: "Ampliação" },
              { value: "regularization", label: "Regularização" },
            ],
          },
          {
            id: "property_location",
            kind: "short_text",
            label: "Onde fica o imóvel ou terreno?",
            required: true,
            maxLength: 240,
          },
          {
            id: "target_area",
            kind: "number",
            label: "Qual é a área construída desejada, aproximadamente?",
            description: "Informe em m², se já houver uma estimativa.",
            required: false,
            min: 1,
            max: 100000,
          },
        ],
      },
      {
        id: "people",
        title: "Pessoas e rotina",
        description: "Quem usará os espaços e como vive.",
        questions: [
          {
            id: "resident_count",
            kind: "number",
            label: "Quantas pessoas usarão a residência?",
            required: true,
            min: 1,
            max: 100,
          },
          {
            id: "household_profile",
            kind: "long_text",
            label: "Conte um pouco sobre os moradores e a rotina da casa.",
            required: true,
            maxLength: 1800,
          },
          {
            id: "accessibility",
            kind: "boolean",
            label: "Existe alguma necessidade de acessibilidade?",
            required: true,
          },
          {
            id: "pets",
            kind: "short_text",
            label: "Há animais de estimação? Quais?",
            required: false,
            maxLength: 300,
          },
        ],
      },
      {
        id: "needs",
        title: "Necessidades e prioridades",
        description: "Ambientes e critérios que precisam orientar o projeto.",
        questions: [
          {
            id: "residential_spaces",
            kind: "multi_choice",
            label: "Quais ambientes fazem parte do projeto?",
            required: true,
            options: SPACE_OPTIONS_RESIDENTIAL,
            spaceSource: true,
          },
          {
            id: "other_spaces",
            kind: "long_text",
            label: "Há outros ambientes ou usos importantes?",
            required: false,
            maxLength: 1000,
          },
          {
            id: "project_priorities",
            kind: "multi_choice",
            label: "Quais características são prioridade?",
            required: true,
            options: [
              { value: "natural_light", label: "Iluminação natural" },
              { value: "integration", label: "Integração dos ambientes" },
              { value: "privacy", label: "Privacidade" },
              { value: "storage", label: "Armazenamento" },
              { value: "accessibility", label: "Acessibilidade" },
              { value: "low_maintenance", label: "Baixa manutenção" },
              { value: "sustainability", label: "Sustentabilidade" },
            ],
          },
          {
            id: "must_have",
            kind: "long_text",
            label: "O que não pode faltar no resultado final?",
            required: true,
            maxLength: 1500,
          },
        ],
      },
      {
        id: "style",
        title: "Estilo e referências",
        description: "Preferências visuais sem limitar a criação.",
        questions: [
          {
            id: "preferred_style",
            kind: "single_choice",
            label: "Qual direção visual mais combina com você?",
            required: true,
            options: STYLE_OPTIONS,
          },
          {
            id: "liked_references",
            kind: "long_text",
            label: "Quais referências, lugares ou projetos você gosta?",
            description: "Você pode incluir links.",
            required: false,
            maxLength: 2000,
          },
          {
            id: "avoid",
            kind: "long_text",
            label: "Existe algo que você não quer no projeto?",
            required: false,
            maxLength: 1200,
          },
        ],
      },
      {
        id: "investment",
        title: "Investimento e prazo",
        description: "Limites necessários para decisões realistas.",
        questions: [
          {
            id: "investment_range",
            kind: "single_choice",
            label: "Qual faixa de investimento foi considerada para a obra?",
            required: true,
            options: INVESTMENT_OPTIONS,
          },
          {
            id: "target_date",
            kind: "date",
            label: "Existe uma data desejada para iniciar a execução?",
            required: false,
          },
          {
            id: "priority_balance",
            kind: "priority",
            label: "O que pesa mais nas decisões?",
            description: "1 prioriza economia; 5 prioriza liberdade de solução.",
            required: true,
            min: 1,
            max: 5,
          },
        ],
      },
      {
        id: "constraints",
        title: "Restrições e observações",
        description: "Condições que o escritório precisa conhecer.",
        questions: [
          {
            id: "known_constraints",
            kind: "long_text",
            label: "Há regras de condomínio, legislação ou limitações conhecidas?",
            required: false,
            maxLength: 1800,
          },
          {
            id: "decision_makers",
            kind: "short_text",
            label: "Quem participará das aprovações do projeto?",
            required: true,
            maxLength: 300,
          },
          {
            id: "additional_notes",
            kind: "long_text",
            label: "Há mais alguma informação importante?",
            required: false,
            maxLength: 2000,
          },
        ],
      },
    ],
  },
  {
    key: "interiors-residential-v1",
    name: "Projeto de interiores residencial",
    description:
      "Rotina, ambientes, referências, mobiliário e investimento para interiores.",
    segment: "interiors",
    version: 1,
    sections: [
      {
        id: "project",
        title: "Sobre o projeto",
        description: "Imóvel, momento e objetivo principal.",
        questions: [
          {
            id: "project_goal",
            kind: "long_text",
            label: "O que precisa melhorar nos ambientes?",
            required: true,
            maxLength: 1500,
          },
          {
            id: "property_stage",
            kind: "single_choice",
            label: "Qual é a situação atual do imóvel?",
            required: true,
            options: [
              { value: "new_empty", label: "Novo e vazio" },
              { value: "occupied", label: "Em uso" },
              { value: "renovation", label: "Em reforma" },
              { value: "construction", label: "Em construção" },
            ],
          },
          {
            id: "property_location",
            kind: "short_text",
            label: "Onde fica o imóvel?",
            required: true,
            maxLength: 240,
          },
        ],
      },
      {
        id: "people",
        title: "Pessoas e rotina",
        description: "Hábitos que devem orientar layout e escolhas.",
        questions: [
          {
            id: "resident_count",
            kind: "number",
            label: "Quantas pessoas usam o imóvel?",
            required: true,
            min: 1,
            max: 100,
          },
          {
            id: "daily_routine",
            kind: "long_text",
            label: "Como é a rotina nos dias de semana e fins de semana?",
            required: true,
            maxLength: 1800,
          },
          {
            id: "work_from_home",
            kind: "boolean",
            label: "Alguém trabalha ou estuda em casa?",
            required: true,
          },
          {
            id: "pets",
            kind: "short_text",
            label: "Há animais de estimação? Quais?",
            required: false,
            maxLength: 300,
          },
        ],
      },
      {
        id: "needs",
        title: "Ambientes e necessidades",
        description: "O que será projetado e o que precisa permanecer.",
        questions: [
          {
            id: "interiors_spaces",
            kind: "multi_choice",
            label: "Quais ambientes entram no projeto?",
            required: true,
            options: SPACE_OPTIONS_RESIDENTIAL,
            spaceSource: true,
          },
          {
            id: "existing_furniture",
            kind: "long_text",
            label: "Quais móveis ou objetos precisam ser mantidos?",
            required: false,
            maxLength: 1500,
          },
          {
            id: "storage_needs",
            kind: "long_text",
            label: "O que precisa de mais espaço de armazenamento?",
            required: true,
            maxLength: 1200,
          },
          {
            id: "environment_priorities",
            kind: "long_text",
            label: "Quais ambientes são mais urgentes e por quê?",
            required: true,
            maxLength: 1200,
          },
        ],
      },
      {
        id: "style",
        title: "Estilo e referências",
        description: "Preferências de atmosfera, cores e materiais.",
        questions: [
          {
            id: "preferred_style",
            kind: "single_choice",
            label: "Qual direção visual mais combina com você?",
            required: true,
            options: STYLE_OPTIONS,
          },
          {
            id: "color_preferences",
            kind: "long_text",
            label: "Quais cores e materiais você gosta ou evita?",
            required: true,
            maxLength: 1200,
          },
          {
            id: "liked_references",
            kind: "long_text",
            label: "Cole links de referências que representam o resultado desejado.",
            required: false,
            maxLength: 2000,
          },
        ],
      },
      {
        id: "investment",
        title: "Investimento e prazo",
        description: "Faixa disponível e marcos importantes.",
        questions: [
          {
            id: "investment_range",
            kind: "single_choice",
            label: "Qual faixa de investimento foi considerada?",
            required: true,
            options: INVESTMENT_OPTIONS,
          },
          {
            id: "target_date",
            kind: "date",
            label: "Existe uma data desejada para concluir os ambientes?",
            required: false,
          },
          {
            id: "purchase_flexibility",
            kind: "priority",
            label: "Qual é a abertura para compras por etapas?",
            description: "1 precisa resolver de uma vez; 5 aceita executar por fases.",
            required: true,
            min: 1,
            max: 5,
          },
        ],
      },
      {
        id: "constraints",
        title: "Restrições e observações",
        description: "Condições práticas para o desenvolvimento.",
        questions: [
          {
            id: "known_constraints",
            kind: "long_text",
            label: "Há regras de condomínio ou limitações de obra?",
            required: false,
            maxLength: 1600,
          },
          {
            id: "decision_makers",
            kind: "short_text",
            label: "Quem participará das escolhas e aprovações?",
            required: true,
            maxLength: 300,
          },
          {
            id: "additional_notes",
            kind: "long_text",
            label: "Há mais alguma informação importante?",
            required: false,
            maxLength: 2000,
          },
        ],
      },
    ],
  },
  {
    key: "interiors-commercial-v1",
    name: "Projeto comercial compacto",
    description:
      "Operação, público, fluxo, marca e ambientes para pequenos negócios.",
    segment: "interiors",
    version: 1,
    sections: [
      {
        id: "business",
        title: "Sobre o negócio",
        description: "Operação, público e objetivo comercial.",
        questions: [
          {
            id: "business_type",
            kind: "short_text",
            label: "Qual é o tipo de negócio?",
            required: true,
            maxLength: 240,
          },
          {
            id: "business_goal",
            kind: "long_text",
            label: "Que resultado o novo espaço precisa gerar?",
            required: true,
            maxLength: 1500,
          },
          {
            id: "target_audience",
            kind: "long_text",
            label: "Quem é o público atendido?",
            required: true,
            maxLength: 1000,
          },
          {
            id: "daily_people",
            kind: "number",
            label: "Quantas pessoas trabalham ou circulam diariamente?",
            required: true,
            min: 1,
            max: 10000,
          },
        ],
      },
      {
        id: "operation",
        title: "Operação e fluxo",
        description: "Como pessoas, produtos e serviços se movimentam.",
        questions: [
          {
            id: "operation_flow",
            kind: "long_text",
            label: "Descreva o atendimento do início ao fim.",
            required: true,
            maxLength: 1800,
          },
          {
            id: "commercial_spaces",
            kind: "multi_choice",
            label: "Quais ambientes fazem parte da operação?",
            required: true,
            options: SPACE_OPTIONS_COMMERCIAL,
            spaceSource: true,
          },
          {
            id: "equipment",
            kind: "long_text",
            label: "Quais equipamentos ou instalações precisam ser considerados?",
            required: true,
            maxLength: 1500,
          },
          {
            id: "peak_constraints",
            kind: "long_text",
            label: "Quais são os horários ou situações de maior movimento?",
            required: false,
            maxLength: 1000,
          },
        ],
      },
      {
        id: "brand",
        title: "Marca e experiência",
        description: "Percepção desejada para clientes e equipe.",
        questions: [
          {
            id: "brand_personality",
            kind: "long_text",
            label: "Como a marca deve ser percebida no espaço?",
            required: true,
            maxLength: 1200,
          },
          {
            id: "existing_identity",
            kind: "boolean",
            label: "A empresa já possui identidade visual definida?",
            required: true,
          },
          {
            id: "liked_references",
            kind: "long_text",
            label: "Quais espaços ou marcas são boas referências?",
            required: false,
            maxLength: 2000,
          },
          {
            id: "avoid",
            kind: "long_text",
            label: "Que sensação ou solução deve ser evitada?",
            required: false,
            maxLength: 1000,
          },
        ],
      },
      {
        id: "investment",
        title: "Investimento e prazo",
        description: "Limites para priorizar decisões.",
        questions: [
          {
            id: "investment_range",
            kind: "single_choice",
            label: "Qual faixa de investimento foi considerada?",
            required: true,
            options: INVESTMENT_OPTIONS,
          },
          {
            id: "opening_date",
            kind: "date",
            label: "Existe uma data prevista para inauguração?",
            required: false,
          },
          {
            id: "business_downtime",
            kind: "long_text",
            label: "A operação pode parar durante a execução?",
            required: true,
            maxLength: 800,
          },
        ],
      },
      {
        id: "constraints",
        title: "Restrições e aprovações",
        description: "Regras, responsáveis e informações finais.",
        questions: [
          {
            id: "legal_constraints",
            kind: "long_text",
            label: "Há exigências sanitárias, acessibilidade ou regras do imóvel?",
            required: false,
            maxLength: 1800,
          },
          {
            id: "decision_makers",
            kind: "short_text",
            label: "Quem aprovará as decisões do projeto?",
            required: true,
            maxLength: 300,
          },
          {
            id: "additional_notes",
            kind: "long_text",
            label: "Há mais alguma informação importante?",
            required: false,
            maxLength: 2000,
          },
        ],
      },
    ],
  },
] as const;

export function getBriefingTemplatesForSegment(
  segment: BusinessSegment,
): BriefingTemplateSummary[] {
  return BRIEFING_TEMPLATES.filter(
    (template) => template.segment === segment,
  ).map(toTemplateSummary);
}

export function getBriefingTemplate(
  key: unknown,
  segment: unknown,
): BriefingTemplateSnapshot | null {
  if (
    typeof key !== "string" ||
    (segment !== "architecture" && segment !== "interiors")
  ) {
    return null;
  }

  const template = BRIEFING_TEMPLATES.find(
    (item) => item.key === key && item.segment === segment,
  );
  return template ? cloneSnapshot(template) : null;
}

export function parseBriefingTemplateSnapshot(
  input: unknown,
): BriefingTemplateSnapshot | null {
  if (!isRecord(input)) return null;
  if (
    typeof input.key !== "string" ||
    input.key.length < 1 ||
    input.key.length > 120 ||
    typeof input.name !== "string" ||
    input.name.length < 1 ||
    input.name.length > 160 ||
    typeof input.description !== "string" ||
    input.description.length > 500 ||
    (input.segment !== "architecture" && input.segment !== "interiors") ||
    !Number.isSafeInteger(input.version) ||
    (input.version as number) < 1 ||
    !Array.isArray(input.sections) ||
    input.sections.length < 1 ||
    input.sections.length > 12
  ) {
    return null;
  }

  const questionIds = new Set<string>();
  const sections: BriefingSection[] = [];
  let questionCount = 0;

  for (const rawSection of input.sections) {
    if (
      !isRecord(rawSection) ||
      typeof rawSection.id !== "string" ||
      !isSafeIdentifier(rawSection.id) ||
      typeof rawSection.title !== "string" ||
      rawSection.title.length < 1 ||
      rawSection.title.length > 120 ||
      typeof rawSection.description !== "string" ||
      rawSection.description.length > 300 ||
      !Array.isArray(rawSection.questions) ||
      rawSection.questions.length < 1 ||
      rawSection.questions.length > 20
    ) {
      return null;
    }

    const questions: BriefingQuestion[] = [];
    for (const rawQuestion of rawSection.questions) {
      const question = parseQuestion(rawQuestion);
      if (!question || questionIds.has(question.id)) return null;
      questionIds.add(question.id);
      questions.push(question);
      questionCount += 1;
      if (questionCount > 80) return null;
    }

    sections.push({
      id: rawSection.id,
      title: rawSection.title,
      description: rawSection.description,
      questions,
    });
  }

  return {
    key: input.key,
    name: input.name,
    description: input.description,
    segment: input.segment,
    version: input.version as number,
    sections,
  };
}

export function validateBriefingAnswers(
  snapshot: BriefingTemplateSnapshot,
  input: unknown,
  options?: { requireComplete?: boolean },
): BriefingAnswersValidation {
  if (!isRecord(input)) {
    return {
      ok: false,
      error: "As respostas enviadas são inválidas.",
      fieldErrors: {},
      missingRequired: requiredQuestionIds(snapshot),
    };
  }

  const normalized: BriefingAnswers = {};
  const fieldErrors: Record<string, string> = {};
  const questions = allQuestions(snapshot);

  for (const question of questions) {
    const rawAnswer = input[question.id];
    if (rawAnswer === undefined || rawAnswer === null || rawAnswer === "") {
      normalized[question.id] = null;
      continue;
    }

    const answer = normalizeAnswer(question, rawAnswer);
    if (answer.ok) {
      normalized[question.id] = answer.value;
    } else {
      fieldErrors[question.id] = answer.error;
    }
  }

  const missingRequired = questions
    .filter(
      (question) =>
        question.required && !isQuestionAnswered(question, normalized),
    )
    .map((question) => question.id);

  if (options?.requireComplete) {
    for (const questionId of missingRequired) {
      fieldErrors[questionId] ??= "Responda este campo para enviar.";
    }
  }

  if (
    Object.keys(fieldErrors).length > 0 ||
    (options?.requireComplete && missingRequired.length > 0)
  ) {
    return {
      ok: false,
      error:
        options?.requireComplete && missingRequired.length > 0
          ? "Revise os campos obrigatórios antes de enviar."
          : "Revise as respostas destacadas.",
      fieldErrors,
      missingRequired,
    };
  }

  return { ok: true, answers: normalized, missingRequired };
}

export function calculateBriefingProgress(
  snapshot: BriefingTemplateSnapshot,
  answers: BriefingAnswers,
): number {
  const required = allQuestions(snapshot).filter(
    (question) => question.required,
  );
  if (required.length === 0) return 100;
  const completed = required.filter((question) =>
    isQuestionAnswered(question, answers),
  ).length;
  return Math.round((completed / required.length) * 100);
}

export function calculateBriefingSectionProgress(
  section: BriefingSection,
  answers: BriefingAnswers,
): number {
  const required = section.questions.filter((question) => question.required);
  if (required.length === 0) return 100;
  const completed = required.filter((question) =>
    isQuestionAnswered(question, answers),
  ).length;
  return Math.round((completed / required.length) * 100);
}

export function getBriefingMissingRequired(
  snapshot: BriefingTemplateSnapshot,
  answers: BriefingAnswers,
): BriefingQuestion[] {
  return allQuestions(snapshot).filter(
    (question) =>
      question.required && !isQuestionAnswered(question, answers),
  );
}

export function getSuggestedProjectSpaces(
  snapshot: BriefingTemplateSnapshot,
  answers: BriefingAnswers,
): SuggestedProjectSpace[] {
  const suggestions: SuggestedProjectSpace[] = [];
  const seen = new Set<string>();

  for (const question of allQuestions(snapshot)) {
    if (!question.spaceSource || question.kind !== "multi_choice") continue;
    const selected = answers[question.id];
    if (!Array.isArray(selected)) continue;

    for (const value of selected) {
      const option = question.options?.find((item) => item.value === value);
      if (!option) continue;
      const key = `${option.spaceType ?? option.value}:${option.label.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        name: option.label,
        spaceType: option.spaceType ?? option.value,
        sourceQuestionId: question.id,
      });
    }
  }

  return suggestions;
}

export function getAvailableSuggestedProjectSpaces(
  snapshot: BriefingTemplateSnapshot,
  answers: BriefingAnswers,
  existingSpaces: readonly ExistingProjectSpaceSummary[],
  activeSpaceLimit: number,
): SuggestedProjectSpace[] {
  const availableSlots = Math.max(
    0,
    Math.floor(activeSpaceLimit) - existingSpaces.length,
  );
  if (availableSlots === 0) return [];

  const existingKeys = new Set(
    existingSpaces.map((space) => suggestedSpaceKey(space)),
  );
  return getSuggestedProjectSpaces(snapshot, answers)
    .filter((space) => !existingKeys.has(suggestedSpaceKey(space)))
    .slice(0, availableSlots);
}

export function formatBriefingAnswer(
  question: BriefingQuestion,
  answer: BriefingAnswer | undefined,
): string {
  if (answer === null || answer === undefined || answer === "") {
    return "Não informado";
  }
  if (typeof answer === "boolean") return answer ? "Sim" : "Não";
  if (typeof answer === "number") {
    if (question.kind === "currency") {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(answer);
    }
    return new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 2,
    }).format(answer);
  }
  if (Array.isArray(answer)) {
    return answer
      .map(
        (value) =>
          question.options?.find((option) => option.value === value)?.label ??
          value,
      )
      .join(", ");
  }
  if (
    question.kind === "single_choice" ||
    question.kind === "multi_choice"
  ) {
    return (
      question.options?.find((option) => option.value === answer)?.label ??
      answer
    );
  }
  if (question.kind === "date" && /^\d{4}-\d{2}-\d{2}$/.test(answer)) {
    const [year, month, day] = answer.split("-");
    return `${day}/${month}/${year}`;
  }
  return answer;
}

export function allQuestions(
  snapshot: BriefingTemplateSnapshot,
): BriefingQuestion[] {
  return snapshot.sections.flatMap((section) => [...section.questions]);
}

function toTemplateSummary(
  template: BriefingTemplateSnapshot,
): BriefingTemplateSummary {
  return {
    key: template.key,
    name: template.name,
    description: template.description,
    segment: template.segment,
    version: template.version,
    sectionCount: template.sections.length,
    questionCount: allQuestions(template).length,
  };
}

function suggestedSpaceKey(space: ExistingProjectSpaceSummary) {
  return `${space.spaceType}:${space.name
    .trim()
    .normalize("NFKC")
    .toLocaleLowerCase("pt-BR")}`;
}

function cloneSnapshot(
  template: BriefingTemplateSnapshot,
): BriefingTemplateSnapshot {
  return JSON.parse(JSON.stringify(template)) as BriefingTemplateSnapshot;
}

function parseQuestion(input: unknown): BriefingQuestion | null {
  if (
    !isRecord(input) ||
    typeof input.id !== "string" ||
    !isSafeIdentifier(input.id) ||
    typeof input.kind !== "string" ||
    !(BRIEFING_QUESTION_KINDS as readonly string[]).includes(input.kind) ||
    typeof input.label !== "string" ||
    input.label.length < 1 ||
    input.label.length > 300 ||
    typeof input.required !== "boolean"
  ) {
    return null;
  }

  const kind = input.kind as BriefingQuestionKind;
  const description =
    typeof input.description === "string" &&
    input.description.length <= 500
      ? input.description
      : undefined;
  const maxLength =
    Number.isSafeInteger(input.maxLength) &&
    (input.maxLength as number) >= 1 &&
    (input.maxLength as number) <= 5000
      ? (input.maxLength as number)
      : undefined;
  const min =
    typeof input.min === "number" && Number.isFinite(input.min)
      ? input.min
      : undefined;
  const max =
    typeof input.max === "number" && Number.isFinite(input.max)
      ? input.max
      : undefined;

  let options: BriefingQuestionOption[] | undefined;
  if (kind === "single_choice" || kind === "multi_choice") {
    if (
      !Array.isArray(input.options) ||
      input.options.length < 1 ||
      input.options.length > 40
    ) {
      return null;
    }
    options = [];
    const values = new Set<string>();
    for (const rawOption of input.options) {
      if (
        !isRecord(rawOption) ||
        typeof rawOption.value !== "string" ||
        !isSafeOptionValue(rawOption.value) ||
        values.has(rawOption.value) ||
        typeof rawOption.label !== "string" ||
        rawOption.label.length < 1 ||
        rawOption.label.length > 160 ||
        (rawOption.spaceType !== undefined &&
          (typeof rawOption.spaceType !== "string" ||
            !isSafeIdentifier(rawOption.spaceType)))
      ) {
        return null;
      }
      values.add(rawOption.value);
      options.push({
        value: rawOption.value,
        label: rawOption.label,
        ...(rawOption.spaceType
          ? { spaceType: rawOption.spaceType as string }
          : {}),
      });
    }
  }

  if (min !== undefined && max !== undefined && min > max) return null;

  return {
    id: input.id,
    kind,
    label: input.label,
    required: input.required,
    ...(description ? { description } : {}),
    ...(maxLength ? { maxLength } : {}),
    ...(min !== undefined ? { min } : {}),
    ...(max !== undefined ? { max } : {}),
    ...(options ? { options } : {}),
    ...(input.spaceSource === true ? { spaceSource: true } : {}),
  };
}

function normalizeAnswer(
  question: BriefingQuestion,
  raw: unknown,
): { ok: true; value: BriefingAnswer } | { ok: false; error: string } {
  if (question.kind === "short_text" || question.kind === "long_text") {
    if (typeof raw !== "string") {
      return { ok: false, error: "Informe um texto válido." };
    }
    const value = raw.trim();
    const maxLength =
      question.maxLength ?? (question.kind === "short_text" ? 500 : 3000);
    if (value.length > maxLength) {
      return {
        ok: false,
        error: `Use no máximo ${maxLength} caracteres.`,
      };
    }
    return { ok: true, value: value || null };
  }

  if (question.kind === "single_choice") {
    if (
      typeof raw !== "string" ||
      !question.options?.some((option) => option.value === raw)
    ) {
      return { ok: false, error: "Selecione uma opção válida." };
    }
    return { ok: true, value: raw };
  }

  if (question.kind === "multi_choice") {
    if (!Array.isArray(raw) || raw.length > 40) {
      return { ok: false, error: "Selecione opções válidas." };
    }
    const validValues = new Set(
      question.options?.map((option) => option.value) ?? [],
    );
    const value = [...new Set(raw)];
    if (
      value.some(
        (item): boolean => typeof item !== "string" || !validValues.has(item),
      )
    ) {
      return { ok: false, error: "Selecione opções válidas." };
    }
    return { ok: true, value: value as string[] };
  }

  if (question.kind === "boolean") {
    if (typeof raw !== "boolean") {
      return { ok: false, error: "Escolha Sim ou Não." };
    }
    return { ok: true, value: raw };
  }

  if (
    question.kind === "number" ||
    question.kind === "currency" ||
    question.kind === "priority"
  ) {
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      return { ok: false, error: "Informe um número válido." };
    }
    if (question.min !== undefined && raw < question.min) {
      return {
        ok: false,
        error: `O valor mínimo é ${question.min}.`,
      };
    }
    if (question.max !== undefined && raw > question.max) {
      return {
        ok: false,
        error: `O valor máximo é ${question.max}.`,
      };
    }
    return { ok: true, value: raw };
  }

  if (question.kind === "date") {
    if (typeof raw !== "string" || !isValidIsoDate(raw)) {
      return { ok: false, error: "Informe uma data válida." };
    }
    return { ok: true, value: raw };
  }

  return { ok: false, error: "Resposta inválida." };
}

function isQuestionAnswered(
  question: BriefingQuestion,
  answers: BriefingAnswers,
): boolean {
  const answer = answers[question.id];
  if (answer === undefined || answer === null || answer === "") return false;
  if (Array.isArray(answer)) return answer.length > 0;
  return true;
}

function requiredQuestionIds(snapshot: BriefingTemplateSnapshot): string[] {
  return allQuestions(snapshot)
    .filter((question) => question.required)
    .map((question) => question.id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeIdentifier(value: string): boolean {
  return /^[a-z][a-z0-9_]{0,79}$/.test(value);
}

function isSafeOptionValue(value: string): boolean {
  return /^[a-z0-9][a-z0-9_]{0,79}$/.test(value);
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
