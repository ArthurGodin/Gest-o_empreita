"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { clientErrorFor, logServerError } from "@/lib/log";
import { todayBR } from "@/lib/dates";
import { isValidCpfCnpj, normalizeCpfCnpj } from "@/lib/br-documents";
import { createLocalCharges } from "@/lib/billing/asaas";
import {
  companyPrefersManualPix,
  companyUsesManualPix,
  generatePreferredPixForCharge,
} from "@/lib/billing/provider";
import { entryChargeValidationMessage } from "@/lib/billing/entry-percent";

// ─── Schemas ───────────────────────────────────────────────────────────────

export type QuoteActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// ─── Delete (só draft) ─────────────────────────────────────────────────────

export async function deleteQuoteAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const supabase = createClient();

  const { data: current } = await supabase
    .from("quotes")
    .select("status")
    .eq("id", id)
    .eq("company_id", company.company_id)
    .maybeSingle();

  if (!current) return { ok: false, error: "Orçamento não encontrado." };
  if ((current as { status: string }).status !== "draft") {
    return {
      ok: false,
      error:
        "Só dá pra apagar orçamentos em rascunho. Pra retirar um enviado, use 'Duplicar' depois.",
    };
  }

  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("company_id", company.company_id);

  if (error) {
    logServerError("quotes.delete", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath("/app/orcamentos");
  return { ok: true };
}

export type ConvertToProjectResult =
  | { ok: true; project_id: string; billing_warning?: string }
  | { ok: false; error: string };

export type ConvertOptions =
  | string
  | null
  | {
      templateId?: string | null;
      entryPct?: number;
      cpfCnpj?: string;
    };

export async function convertToProjectAction(
  quoteId: string,
  options?: ConvertOptions,
): Promise<ConvertToProjectResult> {
  const normalizedOptions =
    typeof options === "object" && options !== null
      ? options
      : { templateId: options };
  const templateId = normalizedOptions.templateId ?? null;
  const entryPct = normalizedOptions.entryPct ?? 30;
  const cpfCnpj = normalizeCpfCnpj(normalizedOptions.cpfCnpj);

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  if (templateId && !/^[0-9a-fA-F-]{36}$/.test(templateId)) {
    return { ok: false, error: "Template inválido." };
  }
  const entryPercentError = entryChargeValidationMessage(0, entryPct);
  if (entryPercentError) {
    return { ok: false, error: entryPercentError };
  }

  const supabase = createClient();

  // ─── Paywall (Soft Limit) ──────────────────────────────────────────────────
  const { data: companyData } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", company.company_id)
    .single();

  if (companyData?.plan === "free") {
    const { count } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.company_id)
      .in("status", ["planning", "in_progress", "paused"]);

    if (count != null && count >= 1) {
      return {
        ok: false,
        error:
          "O Plano Grátis permite 1 obra simultânea. Conclua a obra atual ou assine o Pro para controlar obras sem limite.",
      };
    }
  }
  // ───────────────────────────────────────────────────────────────────────────

  const [prefersManualPix, manualPixReady] = await Promise.all([
    companyPrefersManualPix(supabase, company.company_id),
    companyUsesManualPix(supabase, company.company_id),
  ]);
  const { data: quote, error: fetchError } = await supabase
    .from("quotes")
    .select(
      "id, status, project_id, customer_id, title, total_cents, customer:customers(id, name, document, phone, email, address)",
    )
    .eq("id", quoteId)
    .eq("company_id", company.company_id)
    .maybeSingle();

  if (fetchError) {
    logServerError("quotes.convert.fetch", fetchError);
    return { ok: false, error: clientErrorFor(fetchError) };
  }
  if (!quote) return { ok: false, error: "Orçamento não encontrado." };

  const q = quote as unknown as {
    id: string;
    status: string;
    project_id: string | null;
    customer_id: string;
    title: string;
    total_cents: number;
    customer: {
      id: string;
      name: string;
      document: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
    } | null;
  };

  if (q.status !== "approved") {
    return {
      ok: false,
      error: "Só dá pra virar obra um orçamento aprovado pelo cliente.",
    };
  }
  if (q.project_id) return { ok: true, project_id: q.project_id };
  if (!q.customer) return { ok: false, error: "Cliente não encontrado." };

  const entryChargeError = entryChargeValidationMessage(
    q.total_cents,
    entryPct,
    { enforceAsaasMinimum: !prefersManualPix },
  );
  if (entryChargeError) {
    return { ok: false, error: entryChargeError };
  }
  if (prefersManualPix && entryPct > 0 && !manualPixReady) {
    return {
      ok: false,
      error:
        "Configure a chave Pix em Configurações antes de virar este orçamento em obra com cobrança de entrada.",
    };
  }

  if (cpfCnpj && !isValidCpfCnpj(cpfCnpj)) {
    return {
      ok: false,
      error: "CPF/CNPJ do cliente é inválido. Corrija antes de gerar cobrança Pix.",
    };
  }

  const billingDocument = normalizeCpfCnpj(cpfCnpj || q.customer.document);
  if (!prefersManualPix && entryPct > 0 && !billingDocument) {
    return {
      ok: false,
      error: "Informe CPF/CNPJ do cliente para gerar a cobrança automática.",
    };
  }
  if (!prefersManualPix && entryPct > 0 && !isValidCpfCnpj(billingDocument)) {
    return {
      ok: false,
      error: "CPF/CNPJ do cliente é inválido. Corrija antes de gerar cobrança automática.",
    };
  }

  const { data: project, error: createError } = await supabase
    .from("projects")
    .insert({
      company_id: company.company_id,
      customer_id: q.customer_id,
      name: q.title,
      address: q.customer.address,
      status: "planning",
      starts_on: todayBR(),
      budget_cents: q.total_cents,
      entry_pct: entryPct,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (createError || !project) {
    logServerError("quotes.convert.create-project", createError);
    return { ok: false, error: clientErrorFor(createError) };
  }

  const projectId = project.id as string;
  const { data: linked, error: linkError } = await supabase
    .from("quotes")
    .update({ project_id: projectId })
    .eq("id", quoteId)
    .eq("company_id", company.company_id)
    .is("project_id", null)
    .select("id")
    .maybeSingle();

  if (linkError) {
    logServerError("quotes.convert.link", linkError);
    await supabase.from("projects").delete().eq("id", projectId);
    return { ok: false, error: clientErrorFor(linkError) };
  }

  if (!linked) {
    await supabase.from("projects").delete().eq("id", projectId);
    const { data: winner } = await supabase
      .from("quotes")
      .select("project_id")
      .eq("id", quoteId)
      .eq("company_id", company.company_id)
      .maybeSingle();
    const winnerId = (winner as { project_id: string | null } | null)?.project_id;
    if (winnerId) return { ok: true, project_id: winnerId };
    return { ok: false, error: "Não foi possível criar a obra. Tente novamente." };
  }

  if (templateId) {
    const { error: tplErr } = await supabase.rpc("instantiate_template_stages", {
      p_project_id: projectId,
      p_company_id: company.company_id,
      p_template_id: templateId,
    });
    if (tplErr) logServerError("quotes.convert.apply-template", tplErr);
  }

  let billingWarning: string | undefined;
  try {
    if (cpfCnpj && normalizeCpfCnpj(q.customer.document) !== cpfCnpj) {
      await supabase
        .from("customers")
        .update({ document: cpfCnpj })
        .eq("id", q.customer_id)
        .eq("company_id", company.company_id);
      q.customer.document = cpfCnpj;
    }

    const charges = await createLocalCharges(supabase, {
      projectId,
      companyId: company.company_id,
      customerId: q.customer_id,
      totalCents: q.total_cents,
      entryPct,
      enforceAsaasMinimum: !prefersManualPix,
    });

    if (charges.entryChargeId) {
      const pix = await generatePreferredPixForCharge(supabase, {
        chargeId: charges.entryChargeId,
        companyId: company.company_id,
        customer: q.customer,
        cpfCnpjOverride: cpfCnpj,
        description: `Entrada - ${q.title}`,
      });
      billingWarning = pix.warning;
    }
  } catch (billingError) {
    logServerError("quotes.convert.billing", billingError);
    billingWarning =
      "Obra criada, mas a cobrança Pix ficou pendente. Gere a cobrança no painel da obra.";
  }

  revalidatePath("/app/orcamentos");
  revalidatePath(`/app/orcamentos/${quoteId}`);
  revalidatePath("/app/obras");
  revalidatePath(`/app/obras/${projectId}`);
  return { ok: true, project_id: projectId, billing_warning: billingWarning };
}
