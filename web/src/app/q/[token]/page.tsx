import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectiveStatus } from "@/lib/quote-status";
import { PublicQuoteView } from "./public-quote-view";
import type { QuoteStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PublicQuoteData {
  id: string;
  number: string;
  title: string;
  description: string | null;
  status: QuoteStatus;
  share_token: string;
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
      id, number, title, description, status, share_token, valid_until,
      sent_at, viewed_at, approved_at, rejected_at, notes,
      total_cents, subtotal_cents,
      company:companies(name, phone, email, logo_url, city, state),
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

/**
 * Marca o orçamento como `viewed` na primeira vez que o cliente abre o link.
 * Idempotente — só roda se status='sent' e viewed_at é null.
 */
async function recordViewIfNeeded(quote: PublicQuoteData) {
  if (quote.status !== "sent" || quote.viewed_at) return;

  const admin = createAdminClient();
  await admin
    .from("quotes")
    .update({
      status: "viewed",
      viewed_at: new Date().toISOString(),
    })
    .eq("id", quote.id)
    .eq("status", "sent"); // safety: não sobrescreve approved/rejected
}

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}) {
  const quote = await loadByToken(params.token);
  if (!quote) return { title: "Orçamento" };
  return {
    title: `${quote.title} — ${quote.company.name}`,
    description: `Orçamento ${quote.number} de ${quote.company.name}`,
    robots: { index: false, follow: false }, // não indexar
  };
}

export default async function PublicQuotePage({
  params,
}: {
  params: { token: string };
}) {
  const quote = await loadByToken(params.token);
  if (!quote) notFound();

  await recordViewIfNeeded(quote);

  const status = effectiveStatus({
    status: quote.status,
    valid_until: quote.valid_until,
  });

  return <PublicQuoteView quote={quote} status={status} />;
}
