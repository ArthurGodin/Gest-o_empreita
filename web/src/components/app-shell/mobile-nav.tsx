"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, HardHat, Home, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/app/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/app/obras", label: "Obras", icon: HardHat },
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/financeiro", label: "Financeiro", icon: Wallet },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden" aria-label="Navegação principal">
      <div className="grid h-16 grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/app" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 touch-manipulation flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-semibold leading-none transition-colors after:absolute after:inset-x-3 after:top-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-slate-100",
                active
                  ? "text-emerald-800 after:opacity-100"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span className="max-w-full truncate px-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
