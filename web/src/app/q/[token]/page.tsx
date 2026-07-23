import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectiveStatus } from "@/lib/quote-status";
import { notifyCompanyOwner } from "@/lib/email/send";
import { buildQuoteViewedEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { PublicToggle } from "./public-toggle";
import type { PublicProjectView } from "./andamento-view";
import type {
  PublicDeliverableReview,
  PublicDeliverableVersion,
  PublicDeliverableView,
} from "./public-deliverables-view";
import type { PublicQuoteViewData } from "./public-quote-view";
import type { ProjectStatus, QuoteStatus, StageStatus } from "@/lib/supabase/types";
import {
  getBusinessVocabulary,
  type BusinessSegment,
} from "@/lib/business-segment";

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
    plan: string | null;
    business_segment: BusinessSegment;
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
      company:companies(name, phone, email, logo_url, city, state, pix_instructions, plan, business_segment),
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

  const [
    projectRes,
    stagesRes,
    diaryRes,
    diaryCountRes,
    chargesRes,
    acceptanceRes,
  ] =
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
    admin
      .from("project_delivery_acceptances")
      .select("signer_name, accepted_at")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (!projectRes.data) return null;

  const p = projectRes.data as unknown as {
    name: string;
    status: ProjectStatus;
    starts_on: string | null;
    progress_pct: number | null;
    last_diary_at: string | null;
    delivery_approved_at: string | null;
    customer: { city: string | null; state: string | null } | null;
  };

  return {
    name: p.name,
    status: p.status,
    starts_on: p.starts_on,
    city: p.customer?.city ?? null,
    state: p.customer?.state ?? null,
    progress_pct: p.progress_pct,
    last_diary_at: p.last_diary_at,
    delivery_approved_at: p.delivery_approved_at,
    delivery_acceptance: acceptanceRes.data
      ? {
          signer_name: acceptanceRes.data.signer_name,
          accepted_at: acceptanceRes.data.accepted_at,
        }
      : null,
    charges: (chargesRes.data ?? []).map((charge) => ({
      kind: charge.kind,
      status: charge.status,
      amount_cents: charge.amount_cents,
      payment_provider: charge.payment_provider,
      pix_qr_code: charge.pix_qr_code,
      pix_qr_image_b64: charge.pix_qr_image_b64,
      invoice_url: charge.invoice_url,
      due_date: charge.due_date,
      paid_at: charge.paid_at,
      released_at: charge.released_at,
    })) as PublicProjectView["charges"],
    stages: (stagesRes.data ?? []).map((stage) => ({
      position: stage.position,
      name: stage.name,
      status: stage.status as StageStatus,
      est_days: stage.est_days,
      started_on: stage.started_on,
      completed_on: stage.completed_on,
    })),
    diary: (diaryRes.data ?? []).map((entry) => ({
      body: entry.body,
      created_at: entry.created_at,
      photos: (entry.photos ?? []).map((photo) => ({
        id: photo.id,
        position: photo.position,
      })),
    })),
    diary_total: diaryCountRes.count ?? 0,
  };
}

async function loadPublicDeliverables(
  projectId: string,
): Promise<PublicDeliverableView[]> {
  const admin = createAdminClient();
  const [deliverablesRes, versionsRes] = await Promise.all([
    admin
      .from("project_deliverables")
      .select(
        "id, title, description, position, stage:project_stages(name)",
      )
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("position", { ascending: true }),
    admin
      .from("project_deliverable_versions")
      .select(
        `
        id, deliverable_id, version_number, source_kind, external_url,
        file_name, mime_type, size_bytes, change_note, published_at,
        review:project_deliverable_reviews(
          action, signer_name, comment, created_at
        )
      `,
      )
      .eq("project_id", projectId)
      .not("published_at", "is", null)
      .order("version_number", { ascending: true }),
  ]);

  if (deliverablesRes.error || versionsRes.error) return [];

  type RawDeliverable = {
    id: string;
    title: string;
    description: string | null;
    position: number;
    stage: { name: string } | Array<{ name: string }> | null;
  };
  type RawVersion = Omit<
    PublicDeliverableVersion,
    "published_at" | "review"
  > & {
    deliverable_id: string;
    published_at: string | null;
    review:
      | PublicDeliverableReview
      | PublicDeliverableReview[]
      | null;
  };

  const versionsByDeliverable = new Map<string, PublicDeliverableVersion[]>();
  for (const raw of (versionsRes.data ?? []) as unknown as RawVersion[]) {
    if (!raw.published_at) continue;
    const normalized: PublicDeliverableVersion = {
      id: raw.id,
      version_number: raw.version_number,
      source_kind: raw.source_kind,
      external_url: raw.external_url,
      file_name: raw.file_name,
      mime_type: raw.mime_type,
      size_bytes: raw.size_bytes,
      change_note: raw.change_note,
      published_at: raw.published_at,
      review: firstRelation(raw.review),
    };
    const versions = versionsByDeliverable.get(raw.deliverable_id) ?? [];
    versions.push(normalized);
    versionsByDeliverable.set(raw.deliverable_id, versions);
  }

  return ((deliverablesRes.data ?? []) as unknown as RawDeliverable[])
    .map((deliverable): PublicDeliverableView | null => {
      const versions = (
        versionsByDeliverable.get(deliverable.id) ?? []
      ).sort((a, b) => a.version_number - b.version_number);
      const currentVersion = versions.at(-1);
      if (!currentVersion) return null;

      return {
        id: deliverable.id,
        title: deliverable.title,
        description: deliverable.description,
        stage_name: firstRelation(deliverable.stage)?.name ?? null,
        current_version: currentVersion,
        previous_versions: versions.slice(0, -1),
      };
    })
    .filter(
      (deliverable): deliverable is PublicDeliverableView =>
        deliverable !== null,
    );
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
  const vocabulary = getBusinessVocabulary(
    quote?.company.business_segment,
  );
  if (!quote) {
    return {
      title: "Link de proposta indisponível — Prumo",
      description:
        "A proposta pode ter sido atualizada, expirada ou substituída por um novo link.",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${quote.title} — ${quote.company.name}`,
    description: `${vocabulary.quoteSingular} ${quote.number} de ${quote.company.name}`,
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

  const [project, deliverables] = quote.project_id
    ? await Promise.all([
        loadPublicProjectView(quote.project_id),
        quote.status === "approved"
          ? loadPublicDeliverables(quote.project_id)
          : Promise.resolve([]),
      ])
    : [null, []];

  return (
    <PublicToggle
      quote={toPublicQuoteViewData(quote)}
      status={status}
      project={project}
      deliverables={deliverables}
      shareToken={quote.share_token}
      nowMs={new Date().getTime()}
    />
  );
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toPublicQuoteViewData(quote: PublicQuoteData): PublicQuoteViewData {
  return {
    number: quote.number,
    title: quote.title,
    description: quote.description,
    valid_until: quote.valid_until,
    approved_at: quote.approved_at,
    rejected_at: quote.rejected_at,
    notes: quote.notes,
    total_cents: quote.total_cents,
    company: {
      name: quote.company.name,
      phone: quote.company.phone,
      logo_url: quote.company.logo_url,
      city: quote.company.city,
      state: quote.company.state,
      pix_instructions: quote.company.pix_instructions,
      plan: quote.company.plan,
      business_segment: quote.company.business_segment,
    },
    customer: quote.customer
      ? {
          name: quote.customer.name,
          city: quote.customer.city,
          state: quote.customer.state,
        }
      : null,
    items: quote.items.map((item) => ({
      position: item.position,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      total_cents: item.total_cents,
    })),
    approvals: quote.approvals.map((approval) => ({
      action: approval.action,
      signer_name: approval.signer_name,
      rejection_reason: approval.rejection_reason,
      created_at: approval.created_at,
    })),
  };
}
