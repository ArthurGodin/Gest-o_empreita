import { NextResponse } from "next/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { createClient } from "@/lib/supabase/server";
import { generateQuotePdfBuffer } from "@/lib/pdf/generate";

/**
 * Route handler que streama o PDF do orçamento pra empreiteiro autenticado.
 * Verifica que o quote pertence à empresa ativa antes de servir.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const company = await getActiveCompany();
  if (!company) return new NextResponse("Forbidden", { status: 403 });

  // Confirma ownership (defense-in-depth além do admin client no generate)
  const supabase = createClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, number")
    .eq("id", id)
    .eq("company_id", company.company_id)
    .maybeSingle();

  if (!quote) return new NextResponse("Not found", { status: 404 });

  const result = await generateQuotePdfBuffer(id);
  if (!result.ok) {
    return new NextResponse(result.error, { status: 500 });
  }

  const filename = `${(quote as { number: string }).number}.pdf`;

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
