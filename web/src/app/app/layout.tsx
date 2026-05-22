import { redirect } from "next/navigation";
import { getCurrentUser, getUserCompanies } from "@/lib/queries/company";
import { Sidebar } from "@/components/app-shell/sidebar";
import { MobileNav } from "@/components/app-shell/mobile-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await getUserCompanies();
  if (memberships.length === 0) redirect("/onboarding");

  const first = memberships[0];
  if (!first) redirect("/onboarding");

  const companyName = first.company.name;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar companyName={companyName} />
      <div className="flex flex-1 flex-col pb-16 md:pb-0">
        <main className="flex-1">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
