import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadQuotePdf, downloadQuotePdf } from "@/lib/supabase/storage";
import { logServerError } from "@/lib/log";
import { QuotePdf } from "./quote-pdf";

/**
 * Carrega quote completo e gera o PDF. Caching: se quote.pdf_storage_path
 * existe e foi gerado depois do último updated_at, reusa do Storage.
 * Caso contrário, regenera e atualiza.
 *
 * Retorna o Buffer pronto pra streaming HTTP.
 */
export async function generateQuotePdfBuffer(
  quoteId: string,
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("quotes")
    .select(
      `
      id, number, title, description, valid_until, notes,
      subtotal_cents, discount_cents, total_cents, created_at, updated_at,
      pdf_storage_path,
      company:companies(name, legal_name, cnpj, phone, email, logo_url, address, city, state),
      customer:customers(name, document, phone, email, address, city, state),
      items:quote_items(description, unit, quantity, unit_price_cents, total_cents, position)
    `,
    )
    .eq("id", quoteId)
    .maybeSingle();

  if (error || !data) {
    logServerError("pdf.fetch-quote", error);
    return { ok: false, error: "Orçamento não encontrado." };
  }

  const quote = data as unknown as {
    id: string;
    number: string;
    title: string;
    description: string | null;
    valid_until: string | null;
    notes: string | null;
    subtotal_cents: number;
    discount_cents: number;
    total_cents: number;
    created_at: string;
    updated_at: string;
    pdf_storage_path: string | null;
    company: NonNullable<Parameters<typeof QuotePdf>[0]["company"]>;
    customer: NonNullable<Parameters<typeof QuotePdf>[0]["customer"]> | null;
    items: Array<{
      description: string;
      unit: string;
      quantity: number;
      unit_price_cents: number;
      total_cents: number;
      position: number;
    }>;
  };

  if (!quote.customer) {
    return { ok: false, error: "Orçamento sem cliente vinculado." };
  }

  // Cache check: se pdf existe e foi gerado depois do último update do quote,
  // reusa do Storage. (Storage não nos dá lastModified facilmente, então usamos
  // a estratégia "se path está setado, presumimos válido até o próximo save".)
  if (quote.pdf_storage_path) {
    const cached = await downloadQuotePdf(quote.pdf_storage_path);
    if (cached.ok) {
      return { ok: true, buffer: cached.buffer };
    }
  }

  const items = quote.items.sort((a, b) => a.position - b.position);

  try {
    const buffer = await renderToBuffer(
      <QuotePdf
        company={quote.company}
        customer={quote.customer}
        quote={{
          number: quote.number,
          title: quote.title,
          description: quote.description,
          valid_until: quote.valid_until,
          notes: quote.notes,
          subtotal_cents: quote.subtotal_cents,
          discount_cents: quote.discount_cents,
          total_cents: quote.total_cents,
          created_at: quote.created_at,
        }}
        items={items}
      />,
    );

    // Upload pra Storage (best-effort — não falha se Storage estiver fora)
    const upload = await uploadQuotePdf(quoteId, buffer);
    if (upload.ok) {
      await admin
        .from("quotes")
        .update({ pdf_storage_path: upload.path })
        .eq("id", quoteId);
    }

    return { ok: true, buffer };
  } catch (e) {
    logServerError("pdf.render", e);
    return { ok: false, error: "Falha ao gerar PDF." };
  }
}
