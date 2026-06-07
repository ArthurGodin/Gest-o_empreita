import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tokensMatch } from "@/lib/quote-token";
import { generateQuotePdfBuffer } from "@/lib/pdf/generate";

export const runtime = "nodejs";

/**
 * Route handler público (sem auth) que streama o PDF do orçamento.
 * Autorização: token recebido bate com share_token armazenado.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (token.length < 32) {
    return new NextResponse("Invalid token", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: quote } = await admin
    .from("quotes")
    .select("id, share_token, number")
    .eq("share_token", token)
    .maybeSingle();

  if (!quote) return new NextResponse("Not found", { status: 404 });

  const q = quote as { id: string; share_token: string; number: string };
  if (!tokensMatch(q.share_token, token)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const result = await generateQuotePdfBuffer(q.id);
  if (!result.ok) {
    return new NextResponse(result.error, { status: 500 });
  }

  // SR-#3: Cache-Control private + no-store pra impedir cache compartilhado.
  // PDF contém PII (nome, CPF, telefone, endereço, preços) — não pode ficar
  // em proxies/CDNs intermediários. next.config.mjs aplica o mesmo header
  // como defense-in-depth.
  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${q.number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
