"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { clientErrorFor, logServerError } from "@/lib/log";
import { addDaysBR, todayBR } from "@/lib/dates";
import { env } from "@/lib/env";
import { createLocalCharges } from "@/lib/billing/asaas";
import { generateShareToken } from "@/lib/quote-token";
import {
  normalizeBusinessSegment,
  type BusinessSegment,
} from "@/lib/business-segment";
import {
  getBriefingTemplate,
  getSuggestedProjectSpaces,
  validateBriefingAnswers,
  type BriefingAnswer,
  type BriefingAnswers,
  type BriefingQuestion,
  type BriefingTemplateSnapshot,
} from "@/lib/briefings";
import { getArchitecturePlanLimits } from "@/lib/architecture-plan-limits";
import { normalizeAppPlan } from "@/lib/plans";
import type { Json } from "@/lib/supabase/types";

const DEMO_CUSTOMER_NAME = "Cliente Demo - Maria Santos";
const DEMO_QUOTE_TITLE = "Demo - Cobertura colonial com calhas";
const DEMO_PROJECT_NAME = "Demo - Execução cobertura Maria Santos";
const DEMO_APPROVER = "Maria Santos";
const DEMO_TOTAL_CENTS = 1_078_000;
const DEMO_ENTRY_PCT = 30;

const quoteItems = [
  {
    position: 0,
    description: "Retirada de telhas antigas e limpeza do local",
    unit: "m2",
    quantity: 85,
    unit_price_cents: 2_800,
    total_cents: 238_000,
  },
  {
    position: 1,
    description: "Instalação de telha cerâmica colonial",
    unit: "m2",
    quantity: 85,
    unit_price_cents: 7_200,
    total_cents: 612_000,
  },
  {
    position: 2,
    description: "Calhas, rufos e acabamento",
    unit: "m",
    quantity: 24,
    unit_price_cents: 9_500,
    total_cents: 228_000,
  },
] as const;

function getProjectStages() {
  return [
    {
      position: 0,
      name: "Medição técnica e compra de materiais",
      status: "done" as const,
      est_days: 2,
      started_on: addDaysBR(-5),
      completed_on: addDaysBR(-4),
      notes: "Materiais conferidos antes da retirada da cobertura antiga.",
    },
    {
      position: 1,
      name: "Retirada da cobertura antiga",
      status: "done" as const,
      est_days: 2,
      started_on: addDaysBR(-3),
      completed_on: addDaysBR(-2),
      notes: "Área isolada e entulho separado para descarte.",
    },
    {
      position: 2,
      name: "Instalação da estrutura e telhas",
      status: "in_progress" as const,
      est_days: 4,
      started_on: addDaysBR(-1),
      completed_on: null,
      notes: "Frente principal em andamento.",
    },
    {
      position: 3,
      name: "Calhas, rufos e acabamento",
      status: "todo" as const,
      est_days: 2,
      started_on: null,
      completed_on: null,
      notes: "Liberar após conferência da cobertura.",
    },
    {
      position: 4,
      name: "Vistoria final com cliente",
      status: "todo" as const,
      est_days: 1,
      started_on: null,
      completed_on: null,
      notes: "Registrar aceite e fotos finais.",
    },
  ] as const;
}

const projectCosts = [
  {
    category: "material" as const,
    description: "Telhas cerâmicas e cumeeiras - demo",
    amount_cents: 382_000,
  },
  {
    category: "freight" as const,
    description: "Frete e retirada de entulho - demo",
    amount_cents: 68_000,
  },
] as const;

interface DemoQuoteItem {
  position: number;
  description: string;
  unit: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

interface DemoProjectStage {
  position: number;
  name: string;
  status: "todo" | "in_progress" | "done";
  est_days: number;
  started_on: string | null;
  completed_on: string | null;
  notes: string;
}

interface DemoProjectCost {
  category: "material" | "labor" | "freight" | "other";
  description: string;
  amount_cents: number;
}

interface DemoDeliverable {
  title: string;
  description: string;
  changeNote: string;
}

interface DemoScenario {
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  quoteTitle: string;
  quoteDescription: string;
  projectName: string;
  projectDescription: string;
  projectAddress: string;
  approver: string;
  totalCents: number;
  entryPct: number;
  quoteItems: readonly DemoQuoteItem[];
  projectCosts: readonly DemoProjectCost[];
  deliverables: readonly DemoDeliverable[];
  stages: () => readonly DemoProjectStage[];
}

const CONSTRUCTION_SCENARIO: DemoScenario = {
  customerName: DEMO_CUSTOMER_NAME,
  customerEmail: "cliente.demo@example.com",
  customerAddress: "Rua das Palmeiras, 120",
  customerCity: "Timon",
  customerState: "MA",
  quoteTitle: DEMO_QUOTE_TITLE,
  quoteDescription:
    "Troca de cobertura com telha colonial, calhas novas, retirada de entulho e acompanhamento pelo painel.",
  projectName: DEMO_PROJECT_NAME,
  projectDescription:
    "Obra ficticia para demonstrar etapas, diario, custos e cobrancas.",
  projectAddress: "Rua das Palmeiras, 120 - Timon, MA",
  approver: DEMO_APPROVER,
  totalCents: DEMO_TOTAL_CENTS,
  entryPct: DEMO_ENTRY_PCT,
  quoteItems,
  projectCosts,
  deliverables: [
    {
      title: "Registro da cobertura antes da execucao",
      description:
        "Link ficticio para demonstrar uma entrega publicada ao cliente.",
      changeNote: "Versao inicial do registro da obra.",
    },
  ],
  stages: getProjectStages,
};

const PROFESSIONAL_SCENARIOS: Record<
  Exclude<BusinessSegment, "construction">,
  DemoScenario
> = {
  architecture: {
    customerName: "Cliente Demo - Ana Ribeiro",
    customerEmail: "ana.demo@example.com",
    customerAddress: "Rua das Acacias, 42",
    customerCity: "Sao Paulo",
    customerState: "SP",
    quoteTitle: "Demo - Projeto arquitetonico residencial",
    quoteDescription:
      "Proposta ficticia para projeto residencial com briefing, estudo preliminar, anteprojeto e projeto executivo.",
    projectName: "Demo - Projeto residencial Ana Ribeiro",
    projectDescription:
      "Projeto ficticio para demonstrar etapas, entregas versionadas, aprovacao do cliente e cobrancas.",
    projectAddress: "Rua das Acacias, 42 - Sao Paulo, SP",
    approver: "Ana Ribeiro",
    totalCents: 850_000,
    entryPct: 30,
    quoteItems: [
      {
        position: 0,
        description: "Briefing, levantamento e estudo de viabilidade",
        unit: "un",
        quantity: 1,
        unit_price_cents: 180_000,
        total_cents: 180_000,
      },
      {
        position: 1,
        description: "Estudo preliminar com plantas e volumetria",
        unit: "un",
        quantity: 1,
        unit_price_cents: 260_000,
        total_cents: 260_000,
      },
      {
        position: 2,
        description: "Anteprojeto e revisoes com o cliente",
        unit: "un",
        quantity: 1,
        unit_price_cents: 210_000,
        total_cents: 210_000,
      },
      {
        position: 3,
        description: "Projeto executivo para compatibilizacao",
        unit: "un",
        quantity: 1,
        unit_price_cents: 200_000,
        total_cents: 200_000,
      },
    ],
    projectCosts: [
      {
        category: "other",
        description: "Visita tecnica e levantamento - demo",
        amount_cents: 32_000,
      },
      {
        category: "other",
        description: "Renderizacao e material de apresentacao - demo",
        amount_cents: 58_000,
      },
    ],
    deliverables: [
      {
        title: "Estudo preliminar v1",
        description:
          "Pacote demonstrativo para o cliente aprovar ou pedir alteracoes pelo link.",
        changeNote: "Primeira versao do estudo preliminar.",
      },
      {
        title: "Memorial descritivo resumido",
        description:
          "Entrega demonstrativa para organizar decisoes e escopo aprovado.",
        changeNote: "Memorial inicial para validacao.",
      },
    ],
    stages: () => [
      {
        position: 0,
        name: "Briefing e levantamento",
        status: "done",
        est_days: 3,
        started_on: addDaysBR(-9),
        completed_on: addDaysBR(-7),
        notes: "Necessidades, medidas e referencias iniciais organizadas.",
      },
      {
        position: 1,
        name: "Estudo preliminar",
        status: "in_progress",
        est_days: 6,
        started_on: addDaysBR(-6),
        completed_on: null,
        notes: "Primeira proposta de distribuicao e partido em revisao.",
      },
      {
        position: 2,
        name: "Anteprojeto",
        status: "todo",
        est_days: 7,
        started_on: null,
        completed_on: null,
        notes: "Avancar apos validacao do estudo preliminar.",
      },
      {
        position: 3,
        name: "Projeto executivo",
        status: "todo",
        est_days: 10,
        started_on: null,
        completed_on: null,
        notes: "Detalhamento final para execucao e compatibilizacao.",
      },
    ],
  },
  interiors: {
    customerName: "Cliente Demo - Beatriz Lima",
    customerEmail: "beatriz.demo@example.com",
    customerAddress: "Av. Beira Mar, 510",
    customerCity: "Fortaleza",
    customerState: "CE",
    quoteTitle: "Demo - Projeto de interiores apartamento",
    quoteDescription:
      "Proposta ficticia para interiores com layout, especificacoes, revisoes e entrega final.",
    projectName: "Demo - Interiores apartamento Beatriz Lima",
    projectDescription:
      "Projeto ficticio para demonstrar ambientes, entregas, aprovacoes e cobrancas.",
    projectAddress: "Av. Beira Mar, 510 - Fortaleza, CE",
    approver: "Beatriz Lima",
    totalCents: 620_000,
    entryPct: 30,
    quoteItems: [
      {
        position: 0,
        description: "Briefing e conceito dos ambientes",
        unit: "un",
        quantity: 1,
        unit_price_cents: 120_000,
        total_cents: 120_000,
      },
      {
        position: 1,
        description: "Layout, mobiliario e especificacoes",
        unit: "amb",
        quantity: 3,
        unit_price_cents: 110_000,
        total_cents: 330_000,
      },
      {
        position: 2,
        description: "Apresentacao final e lista de compras",
        unit: "un",
        quantity: 1,
        unit_price_cents: 170_000,
        total_cents: 170_000,
      },
    ],
    projectCosts: [
      {
        category: "other",
        description: "Amostras e materiais de apresentacao - demo",
        amount_cents: 24_000,
      },
      {
        category: "other",
        description: "Visita a fornecedores - demo",
        amount_cents: 36_000,
      },
    ],
    deliverables: [
      {
        title: "Layout dos ambientes v1",
        description:
          "Entrega demonstrativa para o cliente aprovar a disposicao dos ambientes.",
        changeNote: "Primeira versao do layout.",
      },
      {
        title: "Lista inicial de especificacoes",
        description:
          "Entrega demonstrativa com materiais, mobiliario e pendencias.",
        changeNote: "Lista inicial para revisao.",
      },
    ],
    stages: () => [
      {
        position: 0,
        name: "Briefing e conceito",
        status: "done",
        est_days: 2,
        started_on: addDaysBR(-7),
        completed_on: addDaysBR(-6),
        notes: "Preferencias, medidas e referencias reunidas.",
      },
      {
        position: 1,
        name: "Layout dos ambientes",
        status: "in_progress",
        est_days: 5,
        started_on: addDaysBR(-5),
        completed_on: null,
        notes: "Distribuicao em validacao com a cliente.",
      },
      {
        position: 2,
        name: "Especificacoes e fornecedores",
        status: "todo",
        est_days: 6,
        started_on: null,
        completed_on: null,
        notes: "Separar materiais, mobiliario e acabamentos.",
      },
      {
        position: 3,
        name: "Entrega final",
        status: "todo",
        est_days: 2,
        started_on: null,
        completed_on: null,
        notes: "Enviar pacote final e colher aceite.",
      },
    ],
  },
  engineering: {
    customerName: "Cliente Demo - Carlos Menezes",
    customerEmail: "carlos.demo@example.com",
    customerAddress: "Rua Projetada, 88",
    customerCity: "Recife",
    customerState: "PE",
    quoteTitle: "Demo - Laudo e acompanhamento tecnico",
    quoteDescription:
      "Proposta ficticia para vistoria, laudo tecnico, orientacoes e acompanhamento.",
    projectName: "Demo - Acompanhamento tecnico Carlos Menezes",
    projectDescription:
      "Projeto ficticio para demonstrar etapas tecnicas, registros, entregas e cobrancas.",
    projectAddress: "Rua Projetada, 88 - Recife, PE",
    approver: "Carlos Menezes",
    totalCents: 480_000,
    entryPct: 40,
    quoteItems: [
      {
        position: 0,
        description: "Vistoria tecnica e levantamento de informacoes",
        unit: "un",
        quantity: 1,
        unit_price_cents: 140_000,
        total_cents: 140_000,
      },
      {
        position: 1,
        description: "Laudo tecnico com recomendacoes",
        unit: "un",
        quantity: 1,
        unit_price_cents: 220_000,
        total_cents: 220_000,
      },
      {
        position: 2,
        description: "Acompanhamento e revisao final",
        unit: "un",
        quantity: 1,
        unit_price_cents: 120_000,
        total_cents: 120_000,
      },
    ],
    projectCosts: [
      {
        category: "other",
        description: "Deslocamento para vistoria - demo",
        amount_cents: 18_000,
      },
      {
        category: "other",
        description: "Equipamentos de inspecao - demo",
        amount_cents: 42_000,
      },
    ],
    deliverables: [
      {
        title: "Relatorio de vistoria v1",
        description:
          "Entrega demonstrativa para registrar achados e pedir validacao.",
        changeNote: "Primeira versao do relatorio.",
      },
    ],
    stages: () => [
      {
        position: 0,
        name: "Vistoria e levantamento",
        status: "done",
        est_days: 2,
        started_on: addDaysBR(-6),
        completed_on: addDaysBR(-5),
        notes: "Registros tecnicos coletados no local.",
      },
      {
        position: 1,
        name: "Analise e laudo",
        status: "in_progress",
        est_days: 5,
        started_on: addDaysBR(-4),
        completed_on: null,
        notes: "Laudo em elaboracao para revisao.",
      },
      {
        position: 2,
        name: "Entrega e recomendacoes",
        status: "todo",
        est_days: 2,
        started_on: null,
        completed_on: null,
        notes: "Enviar documento final e colher aceite.",
      },
    ],
  },
};

function getDemoScenario(segment: unknown): DemoScenario {
  const normalized = normalizeBusinessSegment(segment);
  if (normalized === "construction") return CONSTRUCTION_SCENARIO;
  return PROFESSIONAL_SCENARIOS[normalized];
}

export type DemoKitResult =
  | {
      ok: true;
      quoteId: string;
      projectId: string;
      quoteUrl: string;
      projectUrl: string;
      publicUrl: string;
      reused: boolean;
    }
  | { ok: false; error: string };

export async function prepareDemoKitAction(): Promise<DemoKitResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const supabase = createClient();
  const companyId = company.company_id;
  const segment = normalizeBusinessSegment(company.company.business_segment);
  const scenario = getDemoScenario(segment);
  let reused = false;

  try {
    const { data: companyPlan, error: companyPlanError } = await supabase
      .from("companies")
      .select("plan")
      .eq("id", companyId)
      .single();
    if (companyPlanError) throw companyPlanError;

    const customerId = await ensureDemoCustomer(
      supabase,
      companyId,
      user.id,
      scenario,
    );
    const quote = await ensureDemoQuote(supabase, {
      companyId,
      customerId,
      userId: user.id,
      scenario,
    });
    reused = quote.reused;

    const projectId = await ensureDemoProject(supabase, {
      companyId,
      customerId,
      quoteId: quote.id,
      userId: user.id,
      scenario,
    });

    await createLocalCharges(supabase, {
      projectId,
      companyId,
      customerId,
      totalCents: scenario.totalCents,
      entryPct: scenario.entryPct,
    });

    await supabase
      .from("quotes")
      .update({ project_id: projectId })
      .eq("id", quote.id)
      .eq("company_id", companyId);

    await ensureDemoArchitectureWorkspace(supabase, {
      companyId,
      projectId,
      userId: user.id,
      shareToken: quote.shareToken,
      segment,
      plan: normalizeAppPlan(companyPlan.plan),
      scenario,
    });

    const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    await ensureDemoDeliverables(supabase, {
      companyId,
      projectId,
      scenario,
      publicUrl: `${baseUrl}/q/${quote.shareToken}`,
    });

    revalidatePath("/app");
    revalidatePath("/app/configuracoes/diagnostico");
    revalidatePath("/app/orcamentos");
    revalidatePath(`/app/orcamentos/${quote.id}`);
    revalidatePath("/app/obras");
    revalidatePath(`/app/obras/${projectId}`);
    revalidatePath("/app/financeiro");

    return {
      ok: true,
      quoteId: quote.id,
      projectId,
      quoteUrl: `/app/orcamentos/${quote.id}`,
      projectUrl: `/app/obras/${projectId}`,
      publicUrl: `${baseUrl}/q/${quote.shareToken}`,
      reused,
    };
  } catch (error) {
    logServerError("diagnostics.demo-kit", error);
    return { ok: false, error: clientErrorFor(error) };
  }
}

async function ensureDemoArchitectureWorkspace(
  supabase: ReturnType<typeof createClient>,
  input: {
    companyId: string;
    projectId: string;
    userId: string;
    shareToken: string;
    segment: BusinessSegment;
    plan: ReturnType<typeof normalizeAppPlan>;
    scenario: DemoScenario;
  },
) {
  if (input.segment !== "architecture" && input.segment !== "interiors") {
    return;
  }

  const templateKey =
    input.segment === "architecture"
      ? "architecture-residential-v1"
      : "interiors-residential-v1";
  const template = getBriefingTemplate(templateKey, input.segment);
  if (!template) throw new Error("Modelo de briefing demo não encontrado.");

  const answers = buildDemoBriefingAnswers(
    template,
    input.segment,
    input.scenario,
  );
  const { data: existing, error: existingError } = await supabase
    .from("project_briefings")
    .select("id,status,active_revision_id")
    .eq("project_id", input.projectId)
    .is("archived_at", null)
    .maybeSingle();
  if (existingError) throw existingError;

  let briefingId = existing?.id ?? null;
  let revisionId = existing?.active_revision_id ?? null;
  let briefingStatus = existing?.status ?? null;

  if (!briefingId) {
    const { data: created, error: createError } = await supabase.rpc(
      "create_project_briefing",
      {
        p_project_id: input.projectId,
        p_template_key: template.key,
        p_schema_version: template.version,
        p_schema_snapshot: template as unknown as Json,
      },
    );
    const createdBriefing = created?.[0];
    if (createError || !createdBriefing) {
      if (!isBriefingPlanLimitError(createError)) {
        throw createError ?? new Error("Briefing demo não criado.");
      }
    } else {
      briefingId = createdBriefing.briefing_id;
      revisionId = createdBriefing.revision_id;
      briefingStatus = "draft";
    }
  }

  if (briefingId && revisionId && briefingStatus !== "reviewed") {
    if (briefingStatus === "draft") {
      const { error: shareError } = await supabase.rpc(
        "share_project_briefing",
        { p_briefing_id: briefingId },
      );
      if (shareError) throw shareError;
    }

    const { data: revision, error: revisionError } = await supabase
      .from("project_briefing_revisions")
      .select("edit_version,submitted_at")
      .eq("id", revisionId)
      .eq("briefing_id", briefingId)
      .single();
    if (revisionError) throw revisionError;

    if (!revision.submitted_at) {
      const admin = createAdminClient();
      const { error: submitError } = await admin.rpc(
        "submit_public_project_briefing",
        {
          p_share_token: input.shareToken,
          p_revision_id: revisionId,
          p_answers: answers as unknown as Json,
          p_expected_edit_version: revision.edit_version,
          p_respondent_name: input.scenario.approver,
        },
      );
      if (submitError) throw submitError;
    }

    const { error: reviewError } = await supabase.rpc(
      "review_project_briefing",
      {
        p_briefing_id: briefingId,
        p_internal_notes:
          "Briefing fictício revisado para demonstração comercial.",
      },
    );
    if (reviewError) throw reviewError;
  }

  await ensureDemoProjectSpaces(supabase, {
    companyId: input.companyId,
    projectId: input.projectId,
    userId: input.userId,
    sourceRevisionId: revisionId,
    plan: input.plan,
    template,
    answers,
  });
}

function buildDemoBriefingAnswers(
  template: BriefingTemplateSnapshot,
  segment: "architecture" | "interiors",
  scenario: DemoScenario,
): BriefingAnswers {
  const demoValues: Record<string, BriefingAnswer> = {
    project_goal:
      segment === "architecture"
        ? "Criar uma residência funcional, bem iluminada e preparada para receber a família nos fins de semana."
        : "Integrar sala e cozinha, melhorar o armazenamento e deixar os ambientes mais acolhedores para a rotina da família.",
    project_scope: "new",
    property_stage: "occupied",
    property_location: scenario.projectAddress,
    target_area: 145,
    resident_count: 3,
    household_profile:
      "Casal com uma filha. Trabalham durante a semana, recebem familiares e valorizam áreas integradas sem perder privacidade.",
    daily_routine:
      "A casa é usada principalmente à noite e nos fins de semana. Uma pessoa trabalha em casa três dias por semana.",
    accessibility: false,
    work_from_home: true,
    pets: "Um cachorro de porte médio.",
    residential_spaces: [
      "sala_estar",
      "cozinha",
      "suite",
      "escritorio",
    ],
    interiors_spaces: [
      "sala_estar",
      "cozinha",
      "suite",
      "escritorio",
    ],
    other_spaces: "Pequeno apoio para guardar bicicletas e itens de limpeza.",
    project_priorities: ["natural_light", "integration", "storage"],
    must_have:
      "Boa iluminação natural, cozinha conectada à sala e um escritório silencioso.",
    existing_furniture:
      "Mesa de jantar em madeira, sofá de três lugares e uma poltrona afetiva.",
    storage_needs:
      "Mais espaço para louças, roupa de cama, materiais de trabalho e objetos de uso diário.",
    environment_priorities:
      "Sala e cozinha são prioridade porque concentram a rotina e recebem visitas.",
    preferred_style: "contemporaneo",
    color_preferences:
      "Tons claros, madeira natural e pontos de verde. Evitar superfícies muito brilhantes.",
    liked_references:
      "Ambientes brasileiros contemporâneos, com luz natural, madeira e soluções simples de manter.",
    avoid:
      "Corredores escuros, excesso de revestimentos e soluções difíceis de limpar.",
    investment_range: "100_250",
    target_date: addDaysBR(90),
    priority_balance: 4,
    purchase_flexibility: 4,
    known_constraints:
      "Condomínio permite intervenções em horário comercial e exige proteção das áreas comuns.",
    decision_makers: `${scenario.approver} e acompanhante`,
    additional_notes:
      "Os dados são fictícios e foram preparados para demonstrar o fluxo completo do Prumo.",
  };

  const rawAnswers: BriefingAnswers = {};
  for (const section of template.sections) {
    for (const question of section.questions) {
      rawAnswers[question.id] = Object.prototype.hasOwnProperty.call(
        demoValues,
        question.id,
      )
        ? (demoValues[question.id] as BriefingAnswer)
        : demoFallbackAnswer(question);
    }
  }

  const validation = validateBriefingAnswers(template, rawAnswers, {
    requireComplete: true,
  });
  if (!validation.ok) {
    throw new Error("Respostas do briefing demo são inválidas.");
  }
  return validation.answers;
}

function demoFallbackAnswer(question: BriefingQuestion): BriefingAnswer {
  if (!question.required) return null;
  if (
    question.kind === "short_text" ||
    question.kind === "long_text"
  ) {
    return "Informação fictícia preparada para a demonstração do projeto.";
  }
  if (question.kind === "single_choice") {
    return question.options?.[0]?.value ?? null;
  }
  if (question.kind === "multi_choice") {
    return question.options?.slice(0, 2).map((option) => option.value) ?? [];
  }
  if (question.kind === "boolean") return false;
  if (question.kind === "date") return addDaysBR(60);
  if (question.kind === "priority") {
    return Math.min(question.max ?? 5, Math.max(question.min ?? 1, 3));
  }
  return Math.max(question.min ?? 1, 1);
}

async function ensureDemoProjectSpaces(
  supabase: ReturnType<typeof createClient>,
  input: {
    companyId: string;
    projectId: string;
    userId: string;
    sourceRevisionId: string | null;
    plan: ReturnType<typeof normalizeAppPlan>;
    template: BriefingTemplateSnapshot;
    answers: BriefingAnswers;
  },
) {
  const { data: existing, error: existingError } = await supabase
    .from("project_spaces")
    .select("id,name,space_type")
    .eq("project_id", input.projectId)
    .is("archived_at", null);
  if (existingError) throw existingError;

  const limits = getArchitecturePlanLimits(input.plan);
  const available = Math.max(
    0,
    limits.activeSpacesPerProject - (existing?.length ?? 0),
  );
  if (available === 0) return;

  const existingKeys = new Set(
    (existing ?? []).map(
      (space) => `${space.space_type}:${space.name.trim().toLowerCase()}`,
    ),
  );
  const suggestions = getSuggestedProjectSpaces(
    input.template,
    input.answers,
  )
    .filter(
      (space) =>
        !existingKeys.has(
          `${space.spaceType}:${space.name.trim().toLowerCase()}`,
        ),
    )
    .slice(0, Math.min(4, available));
  if (suggestions.length === 0) return;

  const firstPosition = existing?.length ?? 0;
  const { data: created, error: createError } = await supabase
    .from("project_spaces")
    .insert(
      suggestions.map((space, index) => ({
        company_id: input.companyId,
        project_id: input.projectId,
        name: space.name,
        space_type: space.spaceType,
        area_m2: 12 + index * 4,
        priority: index === 0 ? ("essential" as const) : ("high" as const),
        status: index === 0 ? ("defined" as const) : ("incomplete" as const),
        notes: "Ambiente fictício para demonstração do programa de necessidades.",
        position: firstPosition + index,
        created_by: input.userId,
      })),
    )
    .select("id,name,status");
  if (createError) throw createError;
  if (!created?.length) return;

  const { error: requirementError } = await supabase
    .from("project_space_requirements")
    .insert(
      created.flatMap((space, index) => [
        {
          company_id: input.companyId,
          project_id: input.projectId,
          space_id: space.id,
          kind: "need" as const,
          description:
            index === 0
              ? "Garantir circulação confortável e integração com a rotina da família."
              : "Definir layout, medidas principais e pontos de uso.",
          priority: index === 0 ? ("essential" as const) : ("high" as const),
          status:
            space.status === "defined"
              ? ("defined" as const)
              : ("pending" as const),
          source_revision_id: input.sourceRevisionId,
          position: 0,
          created_by: input.userId,
        },
        {
          company_id: input.companyId,
          project_id: input.projectId,
          space_id: space.id,
          kind: "preference" as const,
          description:
            "Priorizar luz natural, materiais fáceis de manter e armazenamento discreto.",
          priority: "normal" as const,
          status: "pending" as const,
          source_revision_id: input.sourceRevisionId,
          position: 1,
          created_by: input.userId,
        },
      ]),
    );
  if (requirementError) throw requirementError;
}

function isBriefingPlanLimitError(error: unknown) {
  const message =
    (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  return message.includes("project_briefing_limit_reached");
}

async function ensureDemoCustomer(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  scenario: DemoScenario,
) {
  const { data: existing, error: existingError } = await supabase
    .from("customers")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", scenario.customerName)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        phone: null,
        email: scenario.customerEmail,
        address: scenario.customerAddress,
        city: scenario.customerCity,
        state: scenario.customerState,
        notes: "Cliente ficticio para demonstracao comercial guiada.",
      })
      .eq("id", existing.id)
      .eq("company_id", companyId);
    if (updateError) throw updateError;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: companyId,
      name: scenario.customerName,
      document: null,
      phone: null,
      email: scenario.customerEmail,
      address: scenario.customerAddress,
      city: scenario.customerCity,
      state: scenario.customerState,
      notes: "Cliente fictício para demonstração comercial guiada.",
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Cliente demo não criado.");
  return data.id;
}

async function ensureDemoQuote(
  supabase: ReturnType<typeof createClient>,
  input: {
    companyId: string;
    customerId: string;
    userId: string;
    scenario: DemoScenario;
  },
) {
  const { data: existing, error: existingError } = await supabase
    .from("quotes")
    .select("id, share_token")
    .eq("company_id", input.companyId)
    .eq("title", input.scenario.quoteTitle)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const now = new Date().toISOString();
  const shareToken = existing?.share_token ?? generateShareToken();
  let quoteId = existing?.id ?? null;
  let reused = Boolean(existing);

  if (!quoteId) {
    const { data: numberData, error: numberError } = await supabase.rpc(
      "next_quote_number",
      { p_company_id: input.companyId },
    );
    if (numberError || !numberData) throw numberError;

    const { data: inserted, error: insertError } = await supabase
      .from("quotes")
      .insert({
        company_id: input.companyId,
        customer_id: input.customerId,
        number: numberData as string,
        title: input.scenario.quoteTitle,
        description: input.scenario.quoteDescription,
        status: "approved",
        subtotal_cents: input.scenario.totalCents,
        discount_cents: 0,
        total_cents: input.scenario.totalCents,
        valid_until: addDaysBR(20),
        share_token: shareToken,
        sent_at: now,
        viewed_at: now,
        approved_at: now,
        notes: "Orçamento fictício para demo comercial.",
        created_by: input.userId,
      })
      .select("id")
      .single();

    if (insertError || !inserted) throw insertError;
    quoteId = inserted.id;
    reused = false;
  } else {
    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        customer_id: input.customerId,
        title: input.scenario.quoteTitle,
        description: input.scenario.quoteDescription,
        status: "approved",
        subtotal_cents: input.scenario.totalCents,
        discount_cents: 0,
        total_cents: input.scenario.totalCents,
        valid_until: addDaysBR(20),
        share_token: shareToken,
        sent_at: now,
        viewed_at: now,
        approved_at: now,
        rejected_at: null,
        notes: "Orçamento fictício para demo comercial.",
      })
      .eq("id", quoteId)
      .eq("company_id", input.companyId);

    if (updateError) throw updateError;
  }

  await replaceDemoQuoteItems(
    supabase,
    input.companyId,
    quoteId,
    input.scenario,
  );
  await upsertDemoApproval(input.companyId, quoteId, input.scenario);

  return { id: quoteId, shareToken, reused };
}

async function replaceDemoQuoteItems(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  quoteId: string,
  scenario: DemoScenario,
) {
  const { error: deleteError } = await supabase
    .from("quote_items")
    .delete()
    .eq("quote_id", quoteId)
    .eq("company_id", companyId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("quote_items").insert(
    scenario.quoteItems.map((item) => ({
      quote_id: quoteId,
      company_id: companyId,
      ...item,
    })),
  );
  if (insertError) throw insertError;
}

async function upsertDemoApproval(
  companyId: string,
  quoteId: string,
  scenario: DemoScenario,
) {
  const admin = createAdminClient();
  const { error } = await admin.from("quote_approvals").upsert(
    {
      quote_id: quoteId,
      company_id: companyId,
      action: "approved",
      signer_name: scenario.approver,
      rejection_reason: null,
      user_agent: "Prumo demo kit",
    },
    { onConflict: "quote_id,action", ignoreDuplicates: false },
  );
  if (error) throw error;
}

async function ensureDemoProject(
  supabase: ReturnType<typeof createClient>,
  input: {
    companyId: string;
    customerId: string;
    quoteId: string;
    userId: string;
    scenario: DemoScenario;
  },
) {
  const { data: existing, error: existingError } = await supabase
    .from("projects")
    .select("id")
    .eq("company_id", input.companyId)
    .eq("name", input.scenario.projectName)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  let projectId = existing?.id ?? null;

  if (!projectId) {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        company_id: input.companyId,
        customer_id: input.customerId,
        name: input.scenario.projectName,
        description: input.scenario.projectDescription,
        address: input.scenario.projectAddress,
        status: "in_progress",
        starts_on: addDaysBR(-5),
        ends_on: addDaysBR(8),
        budget_cents: input.scenario.totalCents,
        entry_pct: input.scenario.entryPct,
        created_by: input.userId,
      })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("Obra demo não criada.");
    projectId = data.id;
  } else {
    const { error } = await supabase
      .from("projects")
      .update({
        customer_id: input.customerId,
        name: input.scenario.projectName,
        description: input.scenario.projectDescription,
        address: input.scenario.projectAddress,
        status: "in_progress",
        starts_on: addDaysBR(-5),
        ends_on: addDaysBR(8),
        budget_cents: input.scenario.totalCents,
        entry_pct: input.scenario.entryPct,
      })
      .eq("id", projectId)
      .eq("company_id", input.companyId);

    if (error) throw error;
  }

  await replaceDemoProjectStages(
    supabase,
    input.companyId,
    projectId,
    input.scenario,
  );
  await replaceDemoProjectCosts(
    supabase,
    input.companyId,
    projectId,
    input.userId,
    input.scenario,
  );
  await ensureDemoDiaryEntry(
    supabase,
    input.companyId,
    projectId,
    input.userId,
    input.scenario,
  );

  return projectId;
}

async function ensureDemoDeliverables(
  supabase: ReturnType<typeof createClient>,
  input: {
    companyId: string;
    projectId: string;
    scenario: DemoScenario;
    publicUrl: string;
  },
) {
  const externalUrl = input.publicUrl.startsWith("https://")
    ? input.publicUrl
    : "https://example.com/prumo-demo";

  for (const deliverable of input.scenario.deliverables) {
    const { data: existing, error: existingError } = await supabase
      .from("project_deliverables")
      .select("id")
      .eq("company_id", input.companyId)
      .eq("project_id", input.projectId)
      .eq("title", deliverable.title)
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.id) continue;

    const { data: created, error: createError } = await supabase.rpc(
      "create_project_deliverable",
      {
        p_project_id: input.projectId,
        p_stage_id: null,
        p_title: deliverable.title,
        p_description: deliverable.description,
        p_source_kind: "external_link",
        p_external_url: externalUrl,
        p_file_name: null,
        p_mime_type: null,
        p_expected_size_bytes: null,
        p_change_note: deliverable.changeNote,
      },
    );

    const draft = created?.[0];
    if (createError || !draft) {
      throw createError ?? new Error("Entrega demo nao criada.");
    }

    const { error: publishError } = await supabase.rpc(
      "publish_project_deliverable_version",
      {
        p_deliverable_id: draft.deliverable_id,
        p_version_id: draft.version_id,
      },
    );
    if (publishError) throw publishError;
  }
}

async function replaceDemoProjectStages(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  projectId: string,
  scenario: DemoScenario,
) {
  const { error: deleteError } = await supabase
    .from("project_stages")
    .delete()
    .eq("project_id", projectId)
    .eq("company_id", companyId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("project_stages").insert(
    scenario.stages().map((stage) => ({
      project_id: projectId,
      company_id: companyId,
      ...stage,
    })),
  );
  if (insertError) throw insertError;
}

async function replaceDemoProjectCosts(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  projectId: string,
  userId: string,
  scenario: DemoScenario,
) {
  const { error: deleteError } = await supabase
    .from("project_costs")
    .delete()
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .in(
      "description",
      scenario.projectCosts.map((cost) => cost.description),
    );
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("project_costs").insert(
    scenario.projectCosts.map((cost) => ({
      project_id: projectId,
      company_id: companyId,
      incurred_on: todayBR(),
      created_by: userId,
      ...cost,
    })),
  );
  if (insertError) throw insertError;
}

async function ensureDemoDiaryEntry(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  projectId: string,
  userId: string,
  scenario: DemoScenario,
) {
  const { data: existing, error: existingError } = await supabase
    .from("diary_entries")
    .select("id")
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .ilike("body", "%registro demo%")
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return;

  const { error } = await supabase.from("diary_entries").insert({
    project_id: projectId,
    company_id: companyId,
    author_id: userId,
    body: `${scenario.projectDescription} Registro demo.`,
    weather: "Sol",
  });

  if (error) throw error;
}
