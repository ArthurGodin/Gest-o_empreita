import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { isProductEventId } from "@/lib/meta-events";
import { getCurrentUser, getUserCompanies } from "@/lib/queries/company";
import { OnboardingForm } from "./form";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{
    plan?: string;
    signup_event_id?: string;
  }>;
}) {
  const query = searchParams ? await searchParams : {};
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await getUserCompanies();
  if (memberships.length > 0) redirect("/app");

  return (
    <OnboardingForm
      initialSignupEventId={
        isProductEventId(query.signup_event_id)
          ? query.signup_event_id
          : undefined
      }
      metaConfigured={Boolean(env.NEXT_PUBLIC_META_PIXEL_ID)}
    />
  );
}
