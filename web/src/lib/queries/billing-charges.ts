import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ChargeKind, ChargeStatus } from "@/lib/supabase/types";

export interface BillingChargeListItem {
  id: string;
  project_id: string;
  kind: ChargeKind;
  status: ChargeStatus;
  amount_cents: number;
  due_date: string | null;
  paid_at: string | null;
  invoice_url: string | null;
  created_at: string;
  updated_at: string;
}

export const getBillingCharges = cache(
  async (limit = 200): Promise<BillingChargeListItem[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("billing_charges")
      .select(
        "id, project_id, kind, status, amount_cents, due_date, paid_at, invoice_url, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as BillingChargeListItem[];
  },
);
