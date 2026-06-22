import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectiveStatus } from "@/lib/quote-status";
import { notifyCompanyOwner } from "@/lib/email/send";
import { buildQuoteViewedEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { PublicToggle } from "./public-toggle";
import type { PublicProjectView } from "./andamento-view";
import type { ProjectStatus, QuoteStatus, StageStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PublicQuoteData {
  id: string;
  number: string;
  title: string;
  description: string | null;
  status: QuoteStatus;
  share_token: string;
  project_id: string | null;
  company_id: string;
  valid_until: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  notes: string | null;
  total_cents: number;
  subtotal_cents: number;
  company: {
    name: string;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    city: string | null;
    state: string | null;
    pix_instructions: string | null;
  };
  customer: {
    name: string;
    city: string | null;
    state: string | null;
  } | null;
  items: Array<{
    id: string;
    position: number;
    description: string;
    unit: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
  }>;
  approvals: Array<{
    action: "approved" | "rejected";
    signer_name: string;
    rejection_reason: string | null;
    created_at: string;
  }>;
}

async function loadByToken(token: string): Promise<PublicQuoteData | null> {
  if (token.length < 32) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quotes")
    .select(
      `
      id, number, title, description, status, share_token, project_id, company_id,
      valid_until, sent_at, viewed_at, approved_at, rejected_at, notes,
      total_cents, subtotal_cents,
      company:companies(name, phone, email, logo_url, city, state, pix_instructions),
      customer:customers(name, city, state),
      items:quote_items(id, position, description, unit, quantity, unit_price_cents, total_cents),
      approvals:quote_approvals(action, signer_name, rejection_reason, created_at)
    `,
    )
    .eq("share_token", token)
    .maybeSingle();

  if (error || !data) return null;

  const quote = data as unknown as PublicQuoteData;
  quote.items = (quote.items ?? []).sort((a, b) => a.position - b.position);
  return quote;
}

const DIARY_PREVIEW_LIMIT = 10;

/**
 * Carrega a versão pública (segura) do projeto vinculado a este quote.
 * EXPLICITAMENTE NÃO inclui custos, ponto, endereço completo nem autor
 * de diário. TypeScript garante que vazamento é caught em compile-time.
 */
async function loadPublicProjectView(
  projectId: string,
): Promise<PublicProjectView | null> {
  const admin = createAdminClient();

  const [projectRes, stagesRes, diaryRes, diaryCountRes, chargesRes] =
    await Promise.all([
    admin
      .from("projects")
      .select(
        "id, name, status, starts_on, progress_pct, last_diary_at, delivery_approved_at, customer:customers(city, state)",
      )
      .eq("id", projectId)
      .maybeSingle(),
    admin
      .from("project_stages")
      .select("id, position, name, status, est_days, started_on, completed_on")
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
    admin
      .from("diary_entries")
      .select("id, body, created_at, photos:diary_photos(id, position)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(DIARY_PREVIEW_LIMIT),
    admin
      .from("diary_entries")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    admin
      .from("billing_charges")
      .select(
        "id, kind, status, amount_cents, payment_provider, pix_qr_code, pix_qr_image_b64, invoice_url, due_date, paid_at, released_at",
      )
      .eq("project_id", projectId)
      .order("kind", { ascending: true }),
  ]);

  if (!projectRes.data) return null;

  const p = projectRes.data as unknown as {
    id: string;
    name: string;
    status: ProjectStatus;
    starts_on: string | null;
    progress_pct: number | null;
    last_diary_at: string | null;
    delivery_approved_at: string | null;
    customer: { city: string | null; state: string | null } | null;
  };

  return {
    id: p.id,
    name: p.name,
    status: p.status,
    starts_on: p.starts_on,
    city: p.customer?.city ?? null,
    state: p.customer?.state ?? null,
    progress_pct: p.progress_pct,
    last_diary_at: p.last_diary_at,
    delivery_approved_at: p.delivery_approved_at,
    charges: (chargesRes.data ?? []) as PublicProjectView["charges"],
    stages: (stagesRes.data ?? []) as Array<{
      id: string;
      position: number;
      name: string;
      status: StageStatus;
      est_days: number | null;
      started_on: string | null;
      completed_on: string | null;
    }>,
    diary: (diaryRes.data ?? []) as unknown as Array<{
      id: string;
      body: string;
      created_at: string;
      photos: Array<{ id: string; position: number }>;
    }>,
    diary_total: diaryCountRes.count ?? 0,
  };
}

/**
 * Marca o orçamento como `viewed` na primeira vez que o cliente abre o link.
 * Idempotente — só roda se status='sent' e viewed_at é null.
 */
async function recordViewIfNeeded(quote: PublicQuoteData) {
  if (quote.status !== "sent" || quote.viewed_at) return;

  const viewedAt = new Date();
  const admin = createAdminClient();
  const { error } = await admin
    .from("quotes")
    .update({
      status: "viewed",
      viewed_at: viewedAt.toISOString(),
    })
    .eq("id", quote.id)
    .eq("status", "sent"); // safety: não sobrescreve approved/rejected

  if (!error) {
    // Fire and forget notification
    notifyCompanyOwner(
      quote.company_id,
      buildQuoteViewedEmail({
        quoteNumber: quote.number,
        quoteTitle: quote.title,
        totalCents: quote.total_cents,
        customerName: quote.customer?.name ?? "Cliente",
        viewedAt: viewedAt,
        detailUrl: `${env.NEXT_PUBLIC_APP_URL}/app/orcamentos/${quote.id}`,
      })
    ).catch(() => {});
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = await loadByToken(token);
  if (!quote) {
    return {
      title: "Link de orçamento indisponível — Gestão Empreita",
      description:
        "O orçamento pode ter sido atualizado, expirado ou substituído por um novo link.",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${quote.title} — ${quote.company.name}`,
    description: `Orçamento ${quote.number} de ${quote.company.name}`,
    robots: { index: false, follow: false }, // não indexar
  };
}

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = await loadByToken(token);
  if (!quote) notFound();

  await recordViewIfNeeded(quote);

  const status = effectiveStatus({
    status: quote.status,
    valid_until: quote.valid_until,
  });

  const project = quote.project_id
    ? await loadPublicProjectView(quote.project_id)
    : null;

  return (
    <PublicToggle
      quote={quote}
      status={status}
      project={project}
      shareToken={quote.share_token}
      nowMs={new Date().getTime()}
    />
  );
}
