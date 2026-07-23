import { NextResponse } from "next/server";
import { tokensMatch } from "@/lib/quote-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDeliverableSignedDownload } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ token: string; versionId: string }> },
) {
  const { token, versionId } = await params;
  if (
    token.length < 32 ||
    !/^[0-9a-fA-F-]{36}$/.test(versionId)
  ) {
    return new NextResponse("not found", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: quote } = await admin
    .from("quotes")
    .select("project_id, share_token, status")
    .eq("share_token", token)
    .maybeSingle();

  if (
    !quote?.project_id ||
    !quote.share_token ||
    quote.status !== "approved" ||
    !tokensMatch(quote.share_token, token)
  ) {
    return new NextResponse("not found", { status: 404 });
  }

  const { data: version } = await admin
    .from("project_deliverable_versions")
    .select(
      "id, deliverable_id, project_id, storage_path, file_name, source_kind, upload_state, published_at",
    )
    .eq("id", versionId)
    .eq("project_id", quote.project_id)
    .maybeSingle();

  if (
    !version ||
    version.source_kind !== "file" ||
    version.upload_state !== "ready" ||
    !version.storage_path ||
    !version.published_at
  ) {
    return new NextResponse("not found", { status: 404 });
  }

  const { data: deliverable } = await admin
    .from("project_deliverables")
    .select("archived_at")
    .eq("id", version.deliverable_id)
    .eq("project_id", quote.project_id)
    .maybeSingle();

  if (!deliverable || deliverable.archived_at) {
    return new NextResponse("not found", { status: 404 });
  }

  const { data: latest } = await admin
    .from("project_deliverable_versions")
    .select("id")
    .eq("deliverable_id", version.deliverable_id)
    .not("published_at", "is", null)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.id !== version.id) {
    return new NextResponse("not found", { status: 404 });
  }

  const forceDownload =
    new URL(request.url).searchParams.get("download") === "1";
  const signed = await createDeliverableSignedDownload(
    version.storage_path,
    90,
    forceDownload ? version.file_name ?? "entrega" : undefined,
  );
  if (!signed.ok) {
    return new NextResponse("not found", { status: 404 });
  }

  return NextResponse.redirect(signed.url, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
