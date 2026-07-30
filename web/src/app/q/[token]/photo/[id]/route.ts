import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedDiaryPhotoUrl } from "@/lib/supabase/storage";
import { isShareTokenUrlSafe, tokensMatch } from "@/lib/quote-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = () => new NextResponse("not found", { status: 404 });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NOT_FOUND();
  }
  if (!isShareTokenUrlSafe(token)) {
    return NOT_FOUND();
  }

  try {
    const admin = createAdminClient();

    const { data: photo, error: photoError } = await admin
      .from("diary_photos")
      .select("storage_path, project_id")
      .eq("id", id)
      .maybeSingle();

    if (photoError || !photo?.storage_path || !photo.project_id) {
      return NOT_FOUND();
    }

    const { data: quotes, error: quotesError } = await admin
      .from("quotes")
      .select("share_token, status")
      .eq("project_id", photo.project_id)
      .eq("status", "approved");

    const isAuthorized =
      !quotesError &&
      (quotes ?? []).some(
        (quote) =>
          quote.status === "approved" &&
          typeof quote.share_token === "string" &&
          tokensMatch(quote.share_token, token),
      );
    if (!isAuthorized) {
      return NOT_FOUND();
    }

    const signed = await signedDiaryPhotoUrl(photo.storage_path, 300);
    if (!signed.ok) {
      return NOT_FOUND();
    }

    return NextResponse.redirect(signed.url, {
      status: 307,
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return NOT_FOUND();
  }
}
