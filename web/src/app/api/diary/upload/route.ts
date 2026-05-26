import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { resizePhoto, sniffImageMime } from "@/lib/photos/resize";
import { uploadDiaryPhoto } from "@/lib/supabase/storage";
import { logServerError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RAW_BYTES = 10 * 1024 * 1024; // 10 MB raw input

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  const company = await getActiveCompany();
  if (!company) {
    return NextResponse.json(
      { error: "Empresa não encontrada." },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida." },
      { status: 400 },
    );
  }

  const projectId = formData.get("project_id");
  const file = formData.get("file");

  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json(
      { error: "project_id ausente." },
      { status: 400 },
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json(
      { error: "Arquivo vazio." },
      { status: 400 },
    );
  }
  if (file.size > MAX_RAW_BYTES) {
    return NextResponse.json(
      { error: "Foto muito grande (máx 10 MB)." },
      { status: 413 },
    );
  }

  // Authz: project deve pertencer à company
  const supabase = createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("company_id", company.company_id)
    .maybeSingle();
  if (!project) {
    return NextResponse.json(
      { error: "Obra não encontrada." },
      { status: 404 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Defesa-em-profundidade: magic bytes (não confiar no MIME do client)
  if (!sniffImageMime(buffer)) {
    return NextResponse.json(
      { error: "Formato não suportado. Use JPG, PNG ou WebP." },
      { status: 415 },
    );
  }

  const resized = await resizePhoto(buffer);
  if (!resized) {
    return NextResponse.json(
      { error: "Não foi possível processar essa imagem." },
      { status: 422 },
    );
  }

  const uploaded = await uploadDiaryPhoto(
    company.company_id,
    projectId,
    resized.buffer,
  );
  if (!uploaded.ok) {
    logServerError("diary.upload.storage", { message: uploaded.error });
    return NextResponse.json(
      { error: "Falha no upload. Tente novamente." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      storage_path: uploaded.storage_path,
      width: resized.width,
      height: resized.height,
      size_bytes: resized.size_bytes,
    },
    { status: 201 },
  );
}
