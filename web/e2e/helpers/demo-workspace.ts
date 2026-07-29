import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

export async function prepareDemoWorkspace(page: Page, email: string) {
  const admin = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error("Temporary E2E user was not found.");

  const { data: membership, error: membershipError } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .single();
  if (membershipError || !membership) {
    throw membershipError ?? new Error("Temporary E2E company was not found.");
  }

  const { error } = await admin
    .from("companies")
    .update({ plan: "ultimate", workspace_mode: "demo" })
    .eq("id", membership.company_id);
  if (error) throw error;

  await page.goto("/app/demonstracao");
  await page.getByRole("button", { name: "Preparar cenário" }).click();
  const prepareDialog = page.getByRole("dialog", {
    name: "Preparar cenário?",
  });
  await prepareDialog.getByRole("button", { name: "Preparar" }).click();
  await expect(
    page.getByText("Cenário preparado", { exact: true }).first(),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Ainda não preparado")).toHaveCount(0);
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for E2E tests.`);
  return value;
}
