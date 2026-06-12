import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { QuoteStatus } from "@/lib/supabase/types";
import {
  effectiveStatus,
  type EffectiveQuoteStatus,
} from "@/lib/quote-status";

export interface QuoteItem {
  id: string;
  quote_id: string;
  company_id: string;
  position: number;
  description: string;
  unit: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  created_at: string;
}

export interface Quote {
  id: string;
  company_id: string;
  customer_id: string;
  project_id: string | null;
  revision_source_id: string | null;
  number: string;
  title: string;
  description: string | null;
  status: QuoteStatus;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  valid_until: string | null;
  share_token: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  notes: string | null;
  pdf_storage_path: string | null;
  notification_sent_at: string | null;
  whatsapp_sent_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface QuoteRevisionSummary {
  id: string;
  number: string;
  title: string;
  status: QuoteStatus;
  effective_status: EffectiveQuoteStatus;
  total_cents: number;
  sent_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
}

/** Quote enriquecido pra listagem (sem itens, com customer name). */
export interface QuoteListItem extends Quote {
  customer: { id: string; name: string } | null;
  /** Status com expiração derivada */
  effective_status: EffectiveQuoteStatus;
}

export interface QuoteApprovalRecord {
  id: string;
  action: "approved" | "rejected";
  signer_name: string;
  rejection_reason: string | null;
  created_at: string;
}

/** Quote com tudo necessário pra renderizar editor/detalhe. */
export interface QuoteWithRelations extends Quote {
  customer: {
    id: string;
    name: string;
    document: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
  } | null;
  items: QuoteItem[];
  approvals: QuoteApprovalRecord[];
  effective_status: EffectiveQuoteStatus;
}

function isMissingRevisionColumn(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string };
  const text = `${err?.message ?? ""} ${err?.details ?? ""}`;
  return (
    err?.code === "42703" ||
    err?.code === "PGRST204" ||
    text.includes("revision_source_id")
  );
}

export const getQuotes = cache(async (): Promise<QuoteListItem[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("*, customer:customers(id, name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<
    Quote & { customer: { id: string; name: string } | null }
  >;
  return rows.map((q) => ({
    ...q,
    effective_status: effectiveStatus(q),
  }));
});

export const getQuoteWithRelations = cache(
  async (id: string): Promise<QuoteWithRelations | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quotes")
      .select(
        `
        *,
        customer:customers(id, name, document, phone, email, city, state),
        items:quote_items(*),
        approvals:quote_approvals(id, action, signer_name, rejection_reason, created_at)
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const quote = data as unknown as Quote & {
      customer: QuoteWithRelations["customer"];
      items: QuoteItem[];
      approvals: QuoteApprovalRecord[];
    };
    const items = (quote.items ?? []).sort((a, b) => a.position - b.position);
    const approvals = (quote.approvals ?? []).sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    return {
      ...quote,
      items,
      approvals,
      effective_status: effectiveStatus(quote),
    };
  },
);

export const getQuoteRevisions = cache(
  async (sourceId: string): Promise<QuoteRevisionSummary[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quotes")
      .select(
        "id, number, title, status, total_cents, valid_until, sent_at, approved_at, rejected_at, created_at",
      )
      .eq("revision_source_id", sourceId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingRevisionColumn(error)) return [];
      throw error;
    }

    const rows = (data ?? []) as unknown as Array<
      Pick<
        Quote,
        | "id"
        | "number"
        | "title"
        | "status"
        | "total_cents"
        | "valid_until"
        | "sent_at"
        | "approved_at"
        | "rejected_at"
        | "created_at"
      >
    >;

    return rows.map((quote) => ({
      id: quote.id,
      number: quote.number,
      title: quote.title,
      status: quote.status,
      effective_status: effectiveStatus(quote),
      total_cents: quote.total_cents,
      sent_at: quote.sent_at,
      approved_at: quote.approved_at,
      rejected_at: quote.rejected_at,
      created_at: quote.created_at,
    }));
  },
);
