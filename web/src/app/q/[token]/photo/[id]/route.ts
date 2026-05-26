import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedDiaryPhotoUrl } from "@/lib/supabase/storage";
import { tokensMatch } from "@/lib/quote-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { token: string; id: string } },
) {
  if (!/^[0-9a-fA-F-]{36}$/.test(params.id)) {
    return new NextResponse("not found", { status: 404 });
  }
  if (!params.token || params.token.length < 32) {
    return new NextResponse("not found", { status: 404 });
  }

  const admin = createAdminClient();

  const { data: photo } = await admin
    .from("diary_photos")
    .select("storage_path, project_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!photo) {
    return new NextResponse("not found", { status: 404 });
  }

  // Valida que existe quote com esse share_token apontando pro mesmo project
  const { data: quote } = await admin
    .from("quotes")
    .select("share_token")
    .eq("project_id", photo.project_id)
    .maybeSingle();

  if (!quote?.share_token || !tokensMatch(quote.share_token, params.token)) {
    return new NextResponse("not found", { status: 404 });
  }

  const signed = await signedDiaryPhotoUrl(photo.storage_path, 3600);
  if (!signed.ok) {
    return new NextResponse("not found", { status: 404 });
  }

  return NextResponse.redirect(signed.url, {
    status: 307,
    headers: {
      "Cache-Control": "private, max-age=300",
    },
  });
}
