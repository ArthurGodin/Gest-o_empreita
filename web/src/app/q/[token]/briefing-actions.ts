"use server";

import { z } from "zod";
import {
  calculateBriefingProgress,
  validateBriefingAnswers,
  type BriefingAnswers,
} from "@/lib/briefings";
import {
  logServerError,
  logServerEvent,
} from "@/lib/log";
import { getPublicProjectBriefingByToken } from "@/lib/queries/briefings";
import { createAdminClient } from "@/lib/supabase/admin";

const publicInputSchema = z.object({
  shareToken: z.string().regex(/^[A-Za-z0-9_-]{32,256}$/),
  revisionId: z.string().uuid(),
  answers: z.record(
    z.string(),
    z.union([
      z.string(),
      z.array(z.string()),
      z.number(),
      z.boolean(),
      z.null(),
    ]),
  ),
  expectedEditVersion: z.number().int().min(0),
});

export type PublicBriefingSaveResult =
  | {
      ok: true;
      editVersion: number;
      updatedAt: string;
      progress: number;
    }
  | {
      ok: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string>;
    };

export type PublicBriefingSubmitResult =
  | {
      ok: true;
      editVersion: number;
      submittedAt: string;
      created: boolean;
    }
  | {
      ok: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string>;
    };

export async function savePublicBriefingAnswersAction(input: {
  shareToken: string;
  revisionId: string;
  answers: BriefingAnswers;
  expectedEditVersion: number;
}): Promise<PublicBriefingSaveResult> {
  const parsed = publicInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_fields",
      error: "Não foi possível validar estas respostas.",
    };
  }

  const briefing = await getPublicProjectBriefingByToken(
    parsed.data.shareToken,
  );
  if (
    !briefing ||
    briefing.status !== "shared" ||
    briefing.activeRevision.id !== parsed.data.revisionId
  ) {
    return {
      ok: false,
      code: "not_editable",
      error: "Este briefing não está disponível para edição.",
    };
  }

  const validation = validateBriefingAnswers(
    briefing.activeRevision.snapshot,
    parsed.data.answers,
  );
  if (!validation.ok) {
    return {
      ok: false,
      code: "invalid_answers",
      error: validation.error,
      fieldErrors: validation.fieldErrors,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("save_public_project_briefing", {
    p_share_token: parsed.data.shareToken,
    p_revision_id: parsed.data.revisionId,
    p_answers: validation.answers,
    p_expected_edit_version: parsed.data.expectedEditVersion,
  });
  const saved = data?.[0];

  if (error || !saved) {
    logServerError("briefings.public_save", error, {
      briefing_id: briefing.id,
      revision_id: parsed.data.revisionId,
    });
    return publicBriefingError(error);
  }

  const progress = calculateBriefingProgress(
    briefing.activeRevision.snapshot,
    validation.answers,
  );
  logServerEvent("briefings.public_saved", {
    briefing_id: briefing.id,
    revision_id: parsed.data.revisionId,
    progress_bucket: Math.floor(progress / 25) * 25,
  });

  return {
    ok: true,
    editVersion: saved.edit_version,
    updatedAt: saved.updated_at,
    progress,
  };
}

export async function submitPublicBriefingAction(input: {
  shareToken: string;
  revisionId: string;
  answers: BriefingAnswers;
  expectedEditVersion: number;
  respondentName: string;
}): Promise<PublicBriefingSubmitResult> {
  const parsed = publicInputSchema
    .extend({
      respondentName: z.string().trim().min(2).max(120),
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_fields",
      error: "Informe seu nome e revise as respostas.",
    };
  }

  const briefing = await getPublicProjectBriefingByToken(
    parsed.data.shareToken,
  );
  if (!briefing || briefing.activeRevision.id !== parsed.data.revisionId) {
    return {
      ok: false,
      code: "not_found",
      error: "Este briefing não está mais disponível.",
    };
  }

  if (briefing.activeRevision.submittedAt) {
    return {
      ok: true,
      editVersion: briefing.activeRevision.editVersion,
      submittedAt: briefing.activeRevision.submittedAt,
      created: false,
    };
  }

  const validation = validateBriefingAnswers(
    briefing.activeRevision.snapshot,
    parsed.data.answers,
    { requireComplete: true },
  );
  if (!validation.ok) {
    return {
      ok: false,
      code: "incomplete",
      error: validation.error,
      fieldErrors: validation.fieldErrors,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("submit_public_project_briefing", {
    p_share_token: parsed.data.shareToken,
    p_revision_id: parsed.data.revisionId,
    p_answers: validation.answers,
    p_expected_edit_version: parsed.data.expectedEditVersion,
    p_respondent_name: parsed.data.respondentName,
  });
  const submitted = data?.[0];

  if (error || !submitted) {
    logServerError("briefings.public_submit", error, {
      briefing_id: briefing.id,
      revision_id: parsed.data.revisionId,
    });
    return publicBriefingError(error);
  }

  logServerEvent("briefings.public_submitted", {
    briefing_id: briefing.id,
    revision_id: parsed.data.revisionId,
    created: submitted.created,
  });

  return {
    ok: true,
    editVersion: submitted.edit_version,
    submittedAt: submitted.submitted_at,
    created: submitted.created,
  };
}

function publicBriefingError(error: unknown): {
  ok: false;
  error: string;
  code?: string;
} {
  const message = ((error as { message?: string } | null)?.message ?? "")
    .toLowerCase();
  const code = (error as { code?: string } | null)?.code;

  if (
    code === "40001" ||
    message.includes("public_briefing_edit_conflict")
  ) {
    return {
      ok: false,
      code: "edit_conflict",
      error:
        "Estas respostas foram alteradas em outro aparelho. Recarregue a página antes de continuar.",
    };
  }
  if (message.includes("public_briefing_not_found")) {
    return {
      ok: false,
      code: "not_editable",
      error: "Este briefing não está mais disponível para edição.",
    };
  }
  return {
    ok: false,
    code: "unexpected",
    error: "Não foi possível salvar agora. Confira sua conexão e tente novamente.",
  };
}
