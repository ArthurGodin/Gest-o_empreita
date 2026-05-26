import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedDiaryPhotoUrl } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const photoId = params.id;
  if (!/^[0-9a-fA-F-]{36}$/.test(photoId)) {
    return new NextResponse("not found", { status: 404 });
  }

  // RLS filtra pelo tenant — não precisamos validar manualmente.
  // Se o usuário não pertence à company da foto, .maybeSingle() retorna null.
  const supabase = createClient();
  const { data } = await supabase
    .from("diary_photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();

  if (!data) {
    return new NextResponse("not found", { status: 404 });
  }

  const signed = await signedDiaryPhotoUrl(data.storage_path, 3600);
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
