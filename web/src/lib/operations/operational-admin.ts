import "server-only";

import { notFound, redirect } from "next/navigation";
import { serverEnv } from "@/lib/env-server";
import { getCurrentUser } from "@/lib/queries/company";
import { isOperationalAdminEmail } from "./operational-admin-core";

export function hasOperationalAdminAccess(
  user:
    | { email?: string | null; email_confirmed_at?: string | null }
    | null
    | undefined,
) {
  if (!user?.email_confirmed_at) return false;
  return isOperationalAdminEmail(
    user.email,
    serverEnv.OPERATIONAL_ADMIN_EMAILS,
  );
}

export async function requireOperationalAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasOperationalAdminAccess(user)) notFound();
  return user;
}
