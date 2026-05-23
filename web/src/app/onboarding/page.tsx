import { redirect } from "next/navigation";
import { getCurrentUser, getUserCompanies } from "@/lib/queries/company";
import { OnboardingForm } from "./form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await getUserCompanies();
  if (memberships.length > 0) redirect("/app");

  return <OnboardingForm />;
}
