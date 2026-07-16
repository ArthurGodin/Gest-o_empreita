import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

test("Free quotas remain atomic under concurrent writes", async () => {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const suffix = crypto.randomUUID();
  const email = `quota-${suffix}@prumo.test`;
  const password = "Prumo-E2E-Quota-2026!";
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(userError).toBeNull();
  const userId = userData.user!.id;
  let companyId: string | null = null;

  try {
    const { data: company, error: companyError } = await admin
      .from("companies")
      .insert({ name: `Quota QA ${suffix}`, plan: "free" })
      .select("id")
      .single();
    expect(companyError).toBeNull();
    companyId = company!.id;

    const { error: membershipError } = await admin
      .from("company_members")
      .insert({ company_id: companyId, user_id: userId, role: "owner" });
    expect(membershipError).toBeNull();

    const { data: customer, error: customerError } = await admin
      .from("customers")
      .insert({
        company_id: companyId,
        name: "Cliente concorrencia",
        created_by: userId,
      })
      .select("id")
      .single();
    expect(customerError).toBeNull();

    const quoteWrites = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        admin.from("quotes").insert({
          company_id: companyId,
          customer_id: customer!.id,
          number: `QA-${index + 1}-${suffix}`,
          title: `Orcamento concorrente ${index + 1}`,
          share_token: tokenFor(index, suffix),
          created_by: userId,
        }),
      ),
    );
    expect(quoteWrites.filter((result) => !result.error)).toHaveLength(3);
    expect(
      quoteWrites.filter((result) =>
        result.error?.message.includes("free_quote_limit_reached"),
      ),
    ).toHaveLength(1);

    const projectWrites = await Promise.all(
      Array.from({ length: 2 }, (_, index) =>
        admin.from("projects").insert({
          company_id: companyId,
          customer_id: customer!.id,
          name: `Obra concorrente ${index + 1}`,
          status: "planning",
          created_by: userId,
        }),
      ),
    );
    expect(projectWrites.filter((result) => !result.error)).toHaveLength(1);
    expect(
      projectWrites.filter((result) =>
        result.error?.message.includes("free_active_project_limit_reached"),
      ),
    ).toHaveLength(1);

    const { data: pausedProject, error: pausedError } = await admin
      .from("projects")
      .insert({
        company_id: companyId,
        customer_id: customer!.id,
        name: "Obra cancelada para reativacao",
        status: "cancelled",
        created_by: userId,
      })
      .select("id")
      .single();
    expect(pausedError).toBeNull();

    const { error: reactivateError } = await admin
      .from("projects")
      .update({ status: "paused" })
      .eq("id", pausedProject!.id);
    expect(reactivateError?.message).toContain(
      "free_active_project_limit_reached",
    );

    const { error: upgradeError } = await admin
      .from("companies")
      .update({ plan: "pro" })
      .eq("id", companyId);
    expect(upgradeError).toBeNull();

    const [{ error: proQuoteError }, { error: proProjectError }] =
      await Promise.all([
        admin.from("quotes").insert({
          company_id: companyId,
          customer_id: customer!.id,
          number: `QA-PRO-${suffix}`,
          title: "Orcamento Pro",
          share_token: tokenFor(9, suffix),
          created_by: userId,
        }),
        admin
          .from("projects")
          .update({ status: "paused" })
          .eq("id", pausedProject!.id),
      ]);
    expect(proQuoteError).toBeNull();
    expect(proProjectError).toBeNull();
  } finally {
    if (companyId) {
      await admin.from("companies").delete().eq("id", companyId);
    }
    await admin.auth.admin.deleteUser(userId);
  }
});

function tokenFor(index: number, suffix: string) {
  return `${suffix.replaceAll("-", "")}${String(index).padStart(2, "0")}qa`;
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for E2E tests.`);
  return value;
}

