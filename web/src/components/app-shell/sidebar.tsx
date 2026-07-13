"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  HardHat,
  Home,
  LogOut,
  Package,
  Settings,
  Users,
  Wallet,
  Crown,
} from "lucide-react";
import { signoutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/app/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/app/obras", label: "Obras", icon: HardHat },
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/catalogo", label: "Catálogo", icon: Package },
  { href: "/app/financeiro", label: "Financeiro", icon: Wallet },
] as const;

export function Sidebar({ companyName }: { companyName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-slate-200/70 bg-white md:flex md:w-64 md:flex-col">
      <div className="flex h-16 items-center border-b border-slate-200/70 px-6">
        <Link href="/app" className="flex items-center gap-2 font-semibold">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#059669] to-[#10b981] text-white shadow-sm shadow-[#059669]/20">
            <HardHat className="h-4 w-4" />
          </div>
          <span className="truncate">{companyName}</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/app" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-muted-foreground hover:bg-emerald-50 hover:text-emerald-800",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/70 p-3">
        <Link
          href="/app/configuracoes/plano"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[#f47721] transition-colors hover:bg-orange-50"
        >
          <Crown className="h-4 w-4" />
          Meu Plano
        </Link>
        <Link
          href="/app/configuracoes"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground mt-1"
        >
          <Settings className="h-4 w-4" />
          Configurações
        </Link>
        <form action={signoutAction}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
