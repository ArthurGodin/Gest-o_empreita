"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, HardHat, Home, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/app/orcamentos", label: "Orc.", icon: FileText },
  { href: "/app/obras", label: "Obras", icon: HardHat },
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/financeiro", label: "Caixa", icon: Wallet },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
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
              className={cn(
                "flex min-w-0 touch-manipulation flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600",
                active ? "text-emerald-700" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
