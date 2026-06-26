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
  let reused = false;

  try {
    const customerId = await ensureDemoCustomer(supabase, companyId, user.id);
    const quote = await ensureDemoQuote(supabase, {
      companyId,
      customerId,
      userId: user.id,
    });
    reused = quote.reused;

    const projectId = await ensureDemoProject(supabase, {
      companyId,
      customerId,
      quoteId: quote.id,
      userId: user.id,
    });

    await createLocalCharges(supabase, {
      projectId,
      companyId,
      customerId,
      totalCents: DEMO_TOTAL_CENTS,
      entryPct: DEMO_ENTRY_PCT,
    });

    await supabase
      .from("quotes")
      .update({ project_id: projectId })
      .eq("id", quote.id)
      .eq("company_id", companyId);

    const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

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

async function ensureDemoCustomer(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
) {
  const { data: existing, error: existingError } = await supabase
    .from("customers")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", DEMO_CUSTOMER_NAME)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: companyId,
      name: DEMO_CUSTOMER_NAME,
      document: "52998224725",
      phone: "86999990000",
      email: "cliente.demo@example.com",
      address: "Rua das Palmeiras, 120",
      city: "Timon",
      state: "MA",
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
  },
) {
  const { data: existing, error: existingError } = await supabase
    .from("quotes")
    .select("id, share_token")
    .eq("company_id", input.companyId)
    .eq("title", DEMO_QUOTE_TITLE)
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
        title: DEMO_QUOTE_TITLE,
        description:
          "Troca de cobertura com telha colonial, calhas novas, retirada de entulho e acompanhamento pelo painel.",
        status: "approved",
        subtotal_cents: DEMO_TOTAL_CENTS,
        discount_cents: 0,
        total_cents: DEMO_TOTAL_CENTS,
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
        title: DEMO_QUOTE_TITLE,
        description:
          "Troca de cobertura com telha colonial, calhas novas, retirada de entulho e acompanhamento pelo painel.",
        status: "approved",
        subtotal_cents: DEMO_TOTAL_CENTS,
        discount_cents: 0,
        total_cents: DEMO_TOTAL_CENTS,
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

  await replaceDemoQuoteItems(supabase, input.companyId, quoteId);
  await upsertDemoApproval(input.companyId, quoteId);

  return { id: quoteId, shareToken, reused };
}

async function replaceDemoQuoteItems(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  quoteId: string,
) {
  const { error: deleteError } = await supabase
    .from("quote_items")
    .delete()
    .eq("quote_id", quoteId)
    .eq("company_id", companyId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("quote_items").insert(
    quoteItems.map((item) => ({
      quote_id: quoteId,
      company_id: companyId,
      ...item,
    })),
  );
  if (insertError) throw insertError;
}

async function upsertDemoApproval(companyId: string, quoteId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("quote_approvals").upsert(
    {
      quote_id: quoteId,
      company_id: companyId,
      action: "approved",
      signer_name: DEMO_APPROVER,
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
  },
) {
  const { data: existing, error: existingError } = await supabase
    .from("projects")
    .select("id")
    .eq("company_id", input.companyId)
    .eq("name", DEMO_PROJECT_NAME)
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
        name: DEMO_PROJECT_NAME,
        description:
          "Obra fictícia para demonstrar etapas, diário, custos e cobranças.",
        address: "Rua das Palmeiras, 120 - Timon, MA",
        status: "in_progress",
        starts_on: addDaysBR(-5),
        ends_on: addDaysBR(8),
        budget_cents: DEMO_TOTAL_CENTS,
        entry_pct: DEMO_ENTRY_PCT,
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
        name: DEMO_PROJECT_NAME,
        description:
          "Obra fictícia para demonstrar etapas, diário, custos e cobranças.",
        address: "Rua das Palmeiras, 120 - Timon, MA",
        status: "in_progress",
        starts_on: addDaysBR(-5),
        ends_on: addDaysBR(8),
        budget_cents: DEMO_TOTAL_CENTS,
        entry_pct: DEMO_ENTRY_PCT,
      })
      .eq("id", projectId)
      .eq("company_id", input.companyId);

    if (error) throw error;
  }

  await replaceDemoProjectStages(supabase, input.companyId, projectId);
  await replaceDemoProjectCosts(
    supabase,
    input.companyId,
    projectId,
    input.userId,
  );
  await ensureDemoDiaryEntry(supabase, input.companyId, projectId, input.userId);

  return projectId;
}

async function replaceDemoProjectStages(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  projectId: string,
) {
  const { error: deleteError } = await supabase
    .from("project_stages")
    .delete()
    .eq("project_id", projectId)
    .eq("company_id", companyId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("project_stages").insert(
    getProjectStages().map((stage) => ({
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
) {
  const { error: deleteError } = await supabase
    .from("project_costs")
    .delete()
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .in(
      "description",
      projectCosts.map((cost) => cost.description),
    );
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("project_costs").insert(
    projectCosts.map((cost) => ({
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
    body:
      "Equipe iniciou a frente principal, conferiu alinhamento das telhas e deixou pendente a instalação das calhas. Registro demo.",
    weather: "Sol",
  });

  if (error) throw error;
}
