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
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Quote enriquecido pra listagem (sem itens, com customer name). */
export interface QuoteListItem extends Quote {
  customer: { id: string; name: string } | null;
  /** Status com expiração derivada */
  effective_status: EffectiveQuoteStatus;
}

/** Quote com tudo necessário pra renderizar editor/detalhe. */
export interface QuoteWithRelations extends Quote {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
  } | null;
  items: QuoteItem[];
  effective_status: EffectiveQuoteStatus;
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
        customer:customers(id, name, phone, email, city, state),
        items:quote_items(*)
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const quote = data as unknown as Quote & {
      customer: QuoteWithRelations["customer"];
      items: QuoteItem[];
    };
    const items = (quote.items ?? []).sort((a, b) => a.position - b.position);

    return {
      ...quote,
      items,
      effective_status: effectiveStatus(quote),
    };
  },
);
