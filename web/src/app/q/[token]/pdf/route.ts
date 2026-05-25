import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tokensMatch } from "@/lib/quote-token";
import { generateQuotePdfBuffer } from "@/lib/pdf/generate";

/**
 * Route handler público (sem auth) que streama o PDF do orçamento.
 * Autorização: token recebido bate com share_token armazenado.
 */
export async function GET(
  _req: Request,
  { params }: { params: { token: string } },
) {
  if (params.token.length < 32) {
    return new NextResponse("Invalid token", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: quote } = await admin
    .from("quotes")
    .select("id, share_token, number")
    .eq("share_token", params.token)
    .maybeSingle();

  if (!quote) return new NextResponse("Not found", { status: 404 });

  const q = quote as { id: string; share_token: string; number: string };
  if (!tokensMatch(q.share_token, params.token)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const result = await generateQuotePdfBuffer(q.id);
  if (!result.ok) {
    return new NextResponse(result.error, { status: 500 });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${q.number}.pdf"`,
      "Cache-Control": "public, max-age=60",
      "X-Robots-Tag": "noindex",
    },
  });
}
