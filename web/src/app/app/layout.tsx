import { redirect } from "next/navigation";
import { getCurrentUser, getUserCompanies } from "@/lib/queries/company";
import { Sidebar } from "@/components/app-shell/sidebar";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { MobileTopbar } from "@/components/app-shell/mobile-topbar";

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
    <div className="flex min-h-screen w-full overflow-x-hidden bg-slate-50">
      <Sidebar companyName={companyName} />
      <MobileTopbar companyName={companyName} />
      <div className="flex min-w-0 max-w-full flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))] md:pb-0 md:pt-0">
        <main className="min-w-0 max-w-full flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
