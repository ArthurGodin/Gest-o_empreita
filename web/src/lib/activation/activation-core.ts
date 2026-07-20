export type ActivationStage =
  | "company"
  | "customer"
  | "quote"
  | "share"
  | "approval"
  | "project"
  | "payment_setup"
  | "entry_payment";

export interface ActivationStep {
  id: ActivationStage;
  title: string;
  detail: string;
  href: string;
  action: string;
  done: boolean;
}

interface ActivationCompany {
  payment_provider: string | null;
  pix_key_type: string | null;
  pix_key: string | null;
  pix_receiver_name: string | null;
  pix_receiver_city: string | null;
}

interface ActivationQuote {
  id: string;
  title: string;
  status: string;
  effective_status: string;
  total_cents: number;
  project_id: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  approved_at: string | null;
}

interface ActivationProject {
  id: string;
}

interface ActivationCharge {
  project_id: string;
  kind: string;
  status: string;
}

export interface ActivationInput {
  company: ActivationCompany | null;
  customersCount: number;
  quotes: ActivationQuote[];
  projects: ActivationProject[];
  charges: ActivationCharge[];
}

export interface ActivationProgress {
  steps: ActivationStep[];
  nextStep: ActivationStep | null;
  doneCount: number;
  totalCount: number;
  progressPercent: number;
  isComplete: boolean;
}

const PAID_CHARGE_STATUSES = new Set(["received", "confirmed"]);

export function buildActivationProgress(
  input: ActivationInput,
): ActivationProgress {
  const { company, customersCount, quotes, projects, charges } = input;
  const firstQuote = quotes[0];
  const readyQuote = quotes.find((quote) => quote.total_cents > 0);
  const sharedQuote = quotes.find(isSharedQuote);
  const approvedQuote = quotes.find(
    (quote) => quote.effective_status === "approved",
  );
  const project =
    (approvedQuote?.project_id
      ? projects.find((item) => item.id === approvedQuote.project_id)
      : null) ?? projects[0];
  const entryCharge =
    (project
      ? charges.find(
          (charge) =>
            charge.project_id === project.id && charge.kind === "entrada",
        )
      : null) ?? charges.find((charge) => charge.kind === "entrada");
  const paymentReady = isCompanyPaymentReady(company);

  const quoteHref = readyQuote
    ? `/app/orcamentos/${readyQuote.id}`
    : firstQuote
      ? `/app/orcamentos/${firstQuote.id}`
      : "/app/orcamentos/novo";
  const approvalHref = approvedQuote
    ? `/app/orcamentos/${approvedQuote.id}`
    : sharedQuote
      ? `/app/orcamentos/${sharedQuote.id}`
      : quoteHref;
  const projectHref = project
    ? `/app/obras/${project.id}`
    : approvedQuote
      ? `/app/orcamentos/${approvedQuote.id}`
      : approvalHref;

  const steps: ActivationStep[] = [
    {
      id: "company",
      title: "Empresa",
      detail: company ? "Perfil criado." : "Crie o perfil da empresa.",
      href: company ? "/app/configuracoes" : "/onboarding",
      action: company ? "Revisar empresa" : "Criar empresa",
      done: Boolean(company),
    },
    {
      id: "customer",
      title: "Cliente",
      detail:
        customersCount > 0
          ? "Primeiro cliente cadastrado."
          : "Cadastre quem receberá a proposta.",
      href: customersCount > 0 ? "/app/clientes" : "/app/clientes/novo",
      action: customersCount > 0 ? "Ver clientes" : "Cadastrar cliente",
      done: customersCount > 0,
    },
    {
      id: "quote",
      title: "Orçamento",
      detail: readyQuote
        ? "Proposta pronta para revisar e enviar."
        : firstQuote
          ? "Adicione os itens e confira o total."
          : "Monte a primeira proposta.",
      href: quoteHref,
      action: readyQuote
        ? "Revisar orçamento"
        : firstQuote
          ? "Continuar orçamento"
          : "Criar orçamento",
      done: Boolean(readyQuote),
    },
    {
      id: "share",
      title: "Envio",
      detail: sharedQuote
        ? "Link enviado ou aberto pelo cliente."
        : "Envie o link da proposta ao cliente.",
      href: sharedQuote
        ? `/app/orcamentos/${sharedQuote.id}`
        : quoteHref,
      action: sharedQuote ? "Acompanhar proposta" : "Revisar e enviar",
      done: Boolean(sharedQuote),
    },
    {
      id: "approval",
      title: "Aprovação",
      detail: approvedQuote
        ? "Aceite registrado no Prumo."
        : "Acompanhe a decisão do cliente.",
      href: approvalHref,
      action: approvedQuote ? "Ver aprovação" : "Acompanhar aprovação",
      done: Boolean(approvedQuote),
    },
    {
      id: "project",
      title: "Obra",
      detail: project
        ? "Orçamento convertido em obra."
        : "Transforme o aprovado em obra.",
      href: projectHref,
      action: project ? "Abrir obra" : "Criar obra",
      done: Boolean(project),
    },
    {
      id: "payment_setup",
      title: "Recebimento",
      detail: paymentReady
        ? "Forma de recebimento configurada."
        : "Configure o recebimento antes de cobrar.",
      href: "/app/configuracoes",
      action: paymentReady ? "Revisar recebimento" : "Configurar recebimento",
      done: paymentReady,
    },
    buildEntryPaymentStep({ project, charge: entryCharge ?? null, projectHref }),
  ];

  const doneCount = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done) ?? null;

  return {
    steps,
    nextStep,
    doneCount,
    totalCount: steps.length,
    progressPercent: Math.round((doneCount / steps.length) * 100),
    isComplete: nextStep === null,
  };
}

export function isCompanyPaymentReady(
  company: ActivationCompany | null,
): boolean {
  if (!company) return false;
  if (company.payment_provider === "asaas") return true;

  return Boolean(
    company.pix_key_type &&
      company.pix_key?.trim() &&
      company.pix_receiver_name?.trim() &&
      company.pix_receiver_city?.trim(),
  );
}

function isSharedQuote(quote: ActivationQuote): boolean {
  return Boolean(
    quote.sent_at ||
      quote.viewed_at ||
      quote.approved_at ||
      ["sent", "viewed", "approved"].includes(quote.effective_status),
  );
}

function buildEntryPaymentStep({
  project,
  charge,
  projectHref,
}: {
  project: ActivationProject | undefined;
  charge: ActivationCharge | null;
  projectHref: string;
}): ActivationStep {
  if (!project) {
    return {
      id: "entry_payment",
      title: "Entrada",
      detail: "Crie a obra antes de gerar a entrada.",
      href: projectHref,
      action: "Criar obra",
      done: false,
    };
  }

  if (!charge || charge.status === "draft") {
    return {
      id: "entry_payment",
      title: "Entrada",
      detail: "Gere e envie a cobrança da entrada.",
      href: projectHref,
      action: "Gerar entrada",
      done: false,
    };
  }

  if (PAID_CHARGE_STATUSES.has(charge.status)) {
    return {
      id: "entry_payment",
      title: "Entrada",
      detail: "Pagamento confirmado no financeiro.",
      href: "/app/financeiro",
      action: "Ver financeiro",
      done: true,
    };
  }

  if (charge.status === "overdue") {
    return {
      id: "entry_payment",
      title: "Entrada",
      detail: "Cobrança atrasada; revise antes de reenviar.",
      href: projectHref,
      action: "Revisar cobrança",
      done: false,
    };
  }

  if (charge.status === "cancelled") {
    return {
      id: "entry_payment",
      title: "Entrada",
      detail: "Cobrança cancelada; gere uma nova.",
      href: projectHref,
      action: "Gerar nova entrada",
      done: false,
    };
  }

  return {
    id: "entry_payment",
    title: "Entrada",
    detail: "Cobrança enviada; aguardando confirmação.",
    href: projectHref,
    action: "Acompanhar cobrança",
    done: false,
  };
}
