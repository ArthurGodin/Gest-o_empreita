import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import type { Database } from "@/lib/supabase/types";

const PASSWORD = "Prumo-E2E-Deliverables-2026!";

test("versioned deliverables stay tenant-scoped, immutable, and auditable", async () => {
  const admin = createDatabaseClient(requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const tenantA = await createTenant(admin, "A", "pro");
  const tenantB = await createTenant(admin, "B", "pro");
  const userA = await loginAs(tenantA.email);
  const userB = await loginAs(tenantB.email);

  try {
    const bDraft = await createExternalDeliverable(
      userB,
      tenantB.projectId,
      "Entrega privada B",
    );
    expect(bDraft.error).toBeNull();
    expect(bDraft.data?.[0]).toBeTruthy();

    const { data: hiddenRows, error: hiddenError } = await userA
      .from("project_deliverables")
      .select("id")
      .eq("id", bDraft.data![0]!.deliverable_id);
    expect(hiddenError).toBeNull();
    expect(hiddenRows).toEqual([]);

    const { error: directInsertError } = await userA
      .from("project_deliverables")
      .insert({
        company_id: tenantA.companyId,
        project_id: tenantA.projectId,
        title: "Tentativa direta",
      });
    expect(directInsertError).not.toBeNull();

    const { error: crossStageError } = await userA.rpc(
      "create_project_deliverable",
      {
        p_project_id: tenantA.projectId,
        p_stage_id: tenantB.stageId,
        p_title: "Etapa cruzada",
        p_description: null,
        p_source_kind: "external_link",
        p_external_url: "https://example.com/cross-stage",
        p_file_name: null,
        p_mime_type: null,
        p_expected_size_bytes: null,
        p_change_note: null,
      },
    );
    expect(crossStageError).not.toBeNull();

    const firstDraft = await createExternalDeliverable(
      userA,
      tenantA.projectId,
      "Planta baixa",
    );
    expect(firstDraft.error).toBeNull();
    const v1 = firstDraft.data![0]!;

    const { error: publishV1Error } = await userA.rpc(
      "publish_project_deliverable_version",
      {
        p_deliverable_id: v1.deliverable_id,
        p_version_id: v1.version_id,
      },
    );
    expect(publishV1Error).toBeNull();

    const { error: mutatePublishedError } = await admin
      .from("project_deliverable_versions")
      .update({ change_note: "Mutacao indevida" })
      .eq("id", v1.version_id);
    expect(mutatePublishedError?.message).toContain(
      "published_deliverable_version_is_immutable",
    );

    const { error: deletePublishedError } = await admin
      .from("project_deliverable_versions")
      .delete()
      .eq("id", v1.version_id);
    expect(deletePublishedError?.message).toContain(
      "published_deliverable_version_is_immutable",
    );

    const firstReview = await admin.rpc(
      "review_project_deliverable_version",
      {
        p_share_token: tenantA.shareToken,
        p_version_id: v1.version_id,
        p_action: "approved",
        p_signer_name: "Cliente A",
        p_comment: null,
      },
    );
    expect(firstReview.error).toBeNull();
    expect(firstReview.data?.[0]).toMatchObject({
      review_action: "approved",
      created: true,
    });

    const repeatedReview = await admin.rpc(
      "review_project_deliverable_version",
      {
        p_share_token: tenantA.shareToken,
        p_version_id: v1.version_id,
        p_action: "changes_requested",
        p_signer_name: "Outro nome",
        p_comment: "Tentativa de mudar uma decisao existente.",
      },
    );
    expect(repeatedReview.error).toBeNull();
    expect(repeatedReview.data?.[0]).toMatchObject({
      review_action: "approved",
      signer_name: "Cliente A",
      created: false,
    });

    const v2Draft = await createExternalVersion(
      userA,
      v1.deliverable_id,
      "Ajustes iniciais",
      "https://example.com/v2",
    );
    expect(v2Draft.error).toBeNull();
    const v2 = v2Draft.data![0]!;
    const { error: publishV2Error } = await userA.rpc(
      "publish_project_deliverable_version",
      {
        p_deliverable_id: v2.deliverable_id,
        p_version_id: v2.version_id,
      },
    );
    expect(publishV2Error).toBeNull();

    const requestedChanges = await admin.rpc(
      "review_project_deliverable_version",
      {
        p_share_token: tenantA.shareToken,
        p_version_id: v2.version_id,
        p_action: "changes_requested",
        p_signer_name: "Cliente A",
        p_comment: "Ajustar a posicao da bancada antes da aprovacao.",
      },
    );
    expect(requestedChanges.error).toBeNull();
    expect(requestedChanges.data?.[0]).toMatchObject({
      review_action: "changes_requested",
      created: true,
    });

    const { error: completeError } = await admin
      .from("projects")
      .update({ status: "completed" })
      .eq("id", tenantA.projectId);
    expect(completeError).toBeNull();

    const blockedAcceptance = await admin.rpc(
      "record_project_delivery_acceptance",
      {
        p_share_token: tenantA.shareToken,
        p_signer_name: "Cliente A",
      },
    );
    expect(blockedAcceptance.error?.message).toContain(
      "project_deliverables_pending",
    );

    const v3Draft = await createExternalVersion(
      userA,
      v1.deliverable_id,
      "Bancada ajustada",
      "https://example.com/v3",
    );
    expect(v3Draft.error).toBeNull();
    const v3 = v3Draft.data![0]!;
    expect(
      (
        await userA.rpc("publish_project_deliverable_version", {
          p_deliverable_id: v3.deliverable_id,
          p_version_id: v3.version_id,
        })
      ).error,
    ).toBeNull();

    expect(
      (
        await admin.rpc("review_project_deliverable_version", {
          p_share_token: tenantA.shareToken,
          p_version_id: v3.version_id,
          p_action: "approved",
          p_signer_name: "Cliente A",
          p_comment: null,
        })
      ).error,
    ).toBeNull();

    const accepted = await admin.rpc(
      "record_project_delivery_acceptance",
      {
        p_share_token: tenantA.shareToken,
        p_signer_name: "Cliente A",
      },
    );
    expect(accepted.error).toBeNull();
    expect(accepted.data?.[0]).toMatchObject({ created: true });

    const repeatedAcceptance = await admin.rpc(
      "record_project_delivery_acceptance",
      {
        p_share_token: tenantA.shareToken,
        p_signer_name: "Nome repetido",
      },
    );
    expect(repeatedAcceptance.error).toBeNull();
    expect(repeatedAcceptance.data?.[0]).toMatchObject({
      acceptance_id: accepted.data![0]!.acceptance_id,
      created: false,
    });

    const lockedVersion = await createExternalVersion(
      userA,
      v1.deliverable_id,
      "Tentativa apos aceite",
      "https://example.com/locked",
    );
    expect(lockedVersion.error?.message).toContain(
      "project_deliverables_locked",
    );
  } finally {
    await cleanupTenant(admin, tenantA);
    await cleanupTenant(admin, tenantB);
  }
});

test("Free deliverable and storage limits remain atomic", async () => {
  const admin = createDatabaseClient(requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const tenant = await createTenant(admin, "Quota", "free");
  const user = await loginAs(tenant.email);

  try {
    const concurrentCreates = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        createExternalDeliverable(
          user,
          tenant.projectId,
          `Entrega ${index + 1}`,
          `https://example.com/free-${index + 1}`,
        ),
      ),
    );
    expect(concurrentCreates.filter((result) => !result.error)).toHaveLength(3);
    expect(
      concurrentCreates.filter((result) =>
        result.error?.message.includes("deliverable_limit_reached"),
      ),
    ).toHaveLength(1);

    const first = concurrentCreates.find((result) => !result.error)!.data![0]!;
    expect(
      (
        await user.rpc("set_project_deliverable_archived", {
          p_deliverable_id: first.deliverable_id,
          p_archived: true,
        })
      ).error,
    ).toBeNull();

    const replacement = await createExternalDeliverable(
      user,
      tenant.projectId,
      "Entrega substituta",
      "https://example.com/free-replacement",
    );
    expect(replacement.error).toBeNull();

    const restore = await user.rpc("set_project_deliverable_archived", {
      p_deliverable_id: first.deliverable_id,
      p_archived: false,
    });
    expect(restore.error?.message).toContain("deliverable_limit_reached");

    const activeIds = concurrentCreates
      .filter((result) => !result.error)
      .map((result) => result.data![0]!.deliverable_id)
      .filter((id) => id !== first.deliverable_id);
    for (const deliverableId of activeIds) {
      const { error } = await user.rpc("set_project_deliverable_archived", {
        p_deliverable_id: deliverableId,
        p_archived: true,
      });
      expect(error).toBeNull();
    }

    const fileReservation = await createFileDeliverable(
      user,
      tenant.projectId,
      "Arquivo grande",
      15 * 1024 * 1024,
    );
    expect(fileReservation.error).toBeNull();

    const storageOverflow = await createFileDeliverable(
      user,
      tenant.projectId,
      "Arquivo acima da quota restante",
      11 * 1024 * 1024,
    );
    expect(storageOverflow.error?.message).toContain(
      "deliverable_storage_quota_reached",
    );
  } finally {
    await cleanupTenant(admin, tenant);
  }
});

type TenantFixture = {
  userId: string;
  email: string;
  companyId: string;
  customerId: string;
  projectId: string;
  quoteId: string;
  stageId: string;
  shareToken: string;
};

async function createTenant(
  admin: SupabaseClient<Database>,
  label: string,
  plan: "free" | "pro",
): Promise<TenantFixture> {
  const suffix = crypto.randomUUID();
  const email = `deliverables-${label.toLowerCase()}-${suffix}@prumo.test`;
  const { data: userData, error: userError } =
    await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
  if (userError || !userData.user) throw userError ?? new Error("User missing");

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({ name: `Entregaveis ${label} ${suffix}`, plan })
    .select("id")
    .single();
  if (companyError || !company) throw companyError ?? new Error("Company missing");

  const companyId = company.id;
  const userId = userData.user.id;
  const { error: membershipError } = await admin
    .from("company_members")
    .insert({ company_id: companyId, user_id: userId, role: "owner" });
  if (membershipError) throw membershipError;

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({
      company_id: companyId,
      name: `Cliente ${label}`,
      created_by: userId,
    })
    .select("id")
    .single();
  if (customerError || !customer) throw customerError ?? new Error("Customer missing");

  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({
      company_id: companyId,
      customer_id: customer.id,
      name: `Projeto ${label}`,
      status: "planning",
      created_by: userId,
    })
    .select("id")
    .single();
  if (projectError || !project) throw projectError ?? new Error("Project missing");

  const { data: stage, error: stageError } = await admin
    .from("project_stages")
    .insert({
      company_id: companyId,
      project_id: project.id,
      name: `Etapa ${label}`,
      position: 1,
    })
    .select("id")
    .single();
  if (stageError || !stage) throw stageError ?? new Error("Stage missing");

  const shareToken = `${suffix.replaceAll("-", "")}${label.toLowerCase()}deliverables`;
  const { data: quote, error: quoteError } = await admin
    .from("quotes")
    .insert({
      company_id: companyId,
      customer_id: customer.id,
      project_id: project.id,
      number: `ENT-${label}-${suffix.slice(0, 8)}`,
      title: `Proposta ${label}`,
      status: "approved",
      approved_at: new Date().toISOString(),
      share_token: shareToken,
      created_by: userId,
    })
    .select("id")
    .single();
  if (quoteError || !quote) throw quoteError ?? new Error("Quote missing");

  return {
    userId,
    email,
    companyId,
    customerId: customer.id,
    projectId: project.id,
    quoteId: quote.id,
    stageId: stage.id,
    shareToken,
  };
}

async function createExternalDeliverable(
  client: SupabaseClient<Database>,
  projectId: string,
  title: string,
  url = "https://example.com/v1",
) {
  return client.rpc("create_project_deliverable", {
    p_project_id: projectId,
    p_stage_id: null,
    p_title: title,
    p_description: null,
    p_source_kind: "external_link",
    p_external_url: url,
    p_file_name: null,
    p_mime_type: null,
    p_expected_size_bytes: null,
    p_change_note: null,
  });
}

async function createFileDeliverable(
  client: SupabaseClient<Database>,
  projectId: string,
  title: string,
  sizeBytes: number,
) {
  return client.rpc("create_project_deliverable", {
    p_project_id: projectId,
    p_stage_id: null,
    p_title: title,
    p_description: null,
    p_source_kind: "file",
    p_external_url: null,
    p_file_name: `${title}.pdf`,
    p_mime_type: "application/pdf",
    p_expected_size_bytes: sizeBytes,
    p_change_note: null,
  });
}

async function createExternalVersion(
  client: SupabaseClient<Database>,
  deliverableId: string,
  note: string,
  url: string,
) {
  return client.rpc("create_project_deliverable_version", {
    p_deliverable_id: deliverableId,
    p_source_kind: "external_link",
    p_external_url: url,
    p_file_name: null,
    p_mime_type: null,
    p_expected_size_bytes: null,
    p_change_note: note,
  });
}

async function loginAs(email: string) {
  const client = createDatabaseClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
  const { error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw error;
  return client;
}

async function cleanupTenant(
  admin: SupabaseClient<Database>,
  tenant: TenantFixture,
) {
  const { error: companyError } = await admin
    .from("companies")
    .delete()
    .eq("id", tenant.companyId);
  if (companyError) throw companyError;
  await admin.auth.admin.deleteUser(tenant.userId);
}

function createDatabaseClient(key: string) {
  return createClient<Database>(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for E2E tests.`);
  return value;
}
