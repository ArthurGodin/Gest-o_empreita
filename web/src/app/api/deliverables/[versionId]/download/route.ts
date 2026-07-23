import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDeliverableSignedDownload } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const { versionId } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(versionId)) {
    return new NextResponse("not found", { status: 404 });
  }

  const supabase = createClient();
  const { data: version } = await supabase
    .from("project_deliverable_versions")
    .select("storage_path, file_name, source_kind, upload_state")
    .eq("id", versionId)
    .maybeSingle();

  if (
    !version ||
    version.source_kind !== "file" ||
    version.upload_state !== "ready" ||
    !version.storage_path
  ) {
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
