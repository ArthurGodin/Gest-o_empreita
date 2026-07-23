import { redirect } from "next/navigation";
import { getCurrentUser, getUserCompanies } from "@/lib/queries/company";
import { Sidebar } from "@/components/app-shell/sidebar";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { MobileTopbar } from "@/components/app-shell/mobile-topbar";
import { BusinessSegmentProvider } from "@/components/business-segment-context";
import { normalizeBusinessSegment } from "@/lib/business-segment";

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
  const businessSegment = normalizeBusinessSegment(
    first.company.business_segment,
  );

  return (
    <BusinessSegmentProvider segment={businessSegment}>
      <div className="flex min-h-dvh w-full overflow-x-hidden bg-background">
        <a
          href="#app-content"
          className="fixed left-3 top-3 z-[60] -translate-y-20 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
        >
          Pular para o conteúdo
        </a>
        <Sidebar companyName={companyName} />
        <MobileTopbar companyName={companyName} />
        <div className="flex min-w-0 max-w-full flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pb-0 lg:pt-0">
          <main
            id="app-content"
            tabIndex={-1}
            className="min-w-0 max-w-full flex-1 overflow-x-hidden focus:outline-none"
          >
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </BusinessSegmentProvider>
  );
}
