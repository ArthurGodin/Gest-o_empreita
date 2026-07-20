import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import type { Database } from "@/lib/supabase/types";

const PASSWORD = "Prumo-E2E-Tenant-2026!";

test("RLS, security-definer RPCs and Storage keep tenants isolated", async () => {
  const admin = createDatabaseClient(requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const tenantA = await createTenant(admin, "A");
  const tenantB = await createTenant(admin, "B");

  try {
    const userA = createDatabaseClient(requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
    const { error: loginError } = await userA.auth.signInWithPassword({
      email: tenantA.email,
      password: PASSWORD,
    });
    expect(loginError).toBeNull();

    await expectRowsHidden(userA, tenantB);
    await expectWritesBlocked(userA, tenantB);
    await expectSecurityDefinerRpcsBlocked(userA, tenantB);
    await expectPrivateStorageHidden(userA);

    const { data: ownCustomer, error: ownCustomerError } = await userA
      .from("customers")
      .select("id, name")
      .eq("id", tenantA.customerId)
      .single();
    expect(ownCustomerError).toBeNull();
    expect(ownCustomer?.id).toBe(tenantA.customerId);
  } finally {
    await cleanupTenant(admin, tenantA);
    await cleanupTenant(admin, tenantB);
  }
});

type TenantFixture = {
  userId: string;
  email: string;
  companyId: string;
  customerId: string;
  projectId: string;
  quoteId: string;
  diaryId: string;
  costId: string;
  chargeId: string;
};

async function createTenant(
  admin: SupabaseClient<Database>,
  label: string,
): Promise<TenantFixture> {
  const suffix = crypto.randomUUID();
  const email = `tenant-${label.toLowerCase()}-${suffix}@prumo.test`;
  const { data: userData, error: userError } =
    await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
  if (userError || !userData.user) throw userError ?? new Error("User missing");
  const userId = userData.user.id;

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({ name: `Tenant ${label} ${suffix}`, plan: "pro" })
    .select("id")
    .single();
  if (companyError || !company) throw companyError ?? new Error("Company missing");
  const companyId = company.id;

  const { error: membershipError } = await admin.from("company_members").insert({
    company_id: companyId,
    user_id: userId,
    role: "owner",
  });
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
      name: `Obra ${label}`,
      status: "planning",
      created_by: userId,
    })
    .select("id")
    .single();
  if (projectError || !project) throw projectError ?? new Error("Project missing");

  const { data: quote, error: quoteError } = await admin
    .from("quotes")
    .insert({
      company_id: companyId,
      customer_id: customer.id,
      number: `RLS-${label}-${suffix.slice(0, 8)}`,
      title: `Orcamento ${label}`,
      share_token: `${suffix.replaceAll("-", "")}${label.toLowerCase()}qa`,
      created_by: userId,
    })
    .select("id")
    .single();
  if (quoteError || !quote) throw quoteError ?? new Error("Quote missing");

  const { data: diary, error: diaryError } = await admin
    .from("diary_entries")
    .insert({
      project_id: project.id,
      company_id: companyId,
      author_id: userId,
      body: `Diario ${label}`,
    })
    .select("id")
    .single();
  if (diaryError || !diary) throw diaryError ?? new Error("Diary missing");

  const { data: cost, error: costError } = await admin
    .from("project_costs")
    .insert({
      project_id: project.id,
      company_id: companyId,
      category: "material",
      description: `Custo ${label}`,
      amount_cents: 12345,
      created_by: userId,
    })
    .select("id")
    .single();
  if (costError || !cost) throw costError ?? new Error("Cost missing");

  const { data: charge, error: chargeError } = await admin
    .from("billing_charges")
    .insert({
      project_id: project.id,
      company_id: companyId,
      customer_id: customer.id,
      kind: "entrada",
      status: "draft",
      amount_cents: 50000,
    })
    .select("id")
    .single();
  if (chargeError || !charge) throw chargeError ?? new Error("Charge missing");

  return {
    userId,
    email,
    companyId,
    customerId: customer.id,
    projectId: project.id,
    quoteId: quote.id,
    diaryId: diary.id,
    costId: cost.id,
    chargeId: charge.id,
  };
}

async function expectRowsHidden(
  client: SupabaseClient<Database>,
  target: TenantFixture,
) {
  const results = await Promise.all([
    client.from("companies").select("id").eq("id", target.companyId),
    client.from("customers").select("id").eq("id", target.customerId),
    client.from("projects").select("id").eq("id", target.projectId),
    client.from("quotes").select("id").eq("id", target.quoteId),
    client.from("diary_entries").select("id").eq("id", target.diaryId),
    client.from("project_costs").select("id").eq("id", target.costId),
    client.from("billing_charges").select("id").eq("id", target.chargeId),
  ]);

  for (const result of results) {
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  }
}

async function expectWritesBlocked(
  client: SupabaseClient<Database>,
  target: TenantFixture,
) {
  const { data: updated, error: updateError } = await client
    .from("customers")
    .update({ name: "Tentativa cruzada" })
    .eq("id", target.customerId)
    .select("id");
  expect(updateError).toBeNull();
  expect(updated).toEqual([]);

  const { data: deleted, error: deleteError } = await client
    .from("project_costs")
    .delete()
    .eq("id", target.costId)
    .select("id");
  expect(deleteError).toBeNull();
  expect(deleted).toEqual([]);

  const { error: insertError } = await client.from("customers").insert({
    company_id: target.companyId,
    name: "Insercao cruzada",
  });
  expect(insertError).not.toBeNull();
}

async function expectSecurityDefinerRpcsBlocked(
  client: SupabaseClient<Database>,
  target: TenantFixture,
) {
  const { error: quoteError } = await client.rpc("replace_quote_items", {
    p_quote_id: target.quoteId,
    p_company_id: target.companyId,
    p_title: "Tentativa cruzada",
    p_description: null,
    p_customer_id: target.customerId,
    p_valid_until: null,
    p_notes: null,
    p_items: [],
  });
  expect(quoteError).not.toBeNull();

  const { error: diaryError } = await client.rpc("insert_diary_entry", {
    p_project_id: target.projectId,
    p_company_id: target.companyId,
    p_body: "Tentativa cruzada",
    p_photos: [],
  });
  expect(diaryError).not.toBeNull();
}

async function expectPrivateStorageHidden(client: SupabaseClient<Database>) {
  for (const bucket of ["company-logos", "quotes-pdf", "diary-photos"]) {
    const { data } = await client.storage.from(bucket).list("", { limit: 100 });
    expect(data ?? []).toEqual([]);
  }
}

async function cleanupTenant(
  admin: SupabaseClient<Database>,
  tenant: TenantFixture,
) {
  await admin.from("companies").delete().eq("id", tenant.companyId);
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
