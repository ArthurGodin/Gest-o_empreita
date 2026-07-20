"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileText,
  HardHat,
  Home,
  LifeBuoy,
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
    <aside className="hidden border-r bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-56 lg:shrink-0 lg:flex-col">
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/app" className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-white shadow-[0_1px_2px_rgba(15,23,42,0.16)]">
            <HardHat aria-hidden="true" className="h-4 w-4" />
          </div>
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-4 text-slate-950">
              Prumo
            </span>
            <span className="block text-[11px] leading-4 text-muted-foreground">
              Gestão de obras
            </span>
          </span>
        </Link>
      </div>

      <div className="px-3 pt-3">
        <div className="flex min-w-0 items-center gap-2.5 rounded-md border bg-slate-50 px-3 py-2.5">
          <Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
              Empresa
            </span>
            <span
              className="block truncate text-xs font-semibold text-slate-800"
              title={companyName}
            >
              {companyName}
            </span>
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Navegação principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/app" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0",
                active
                  ? "bg-primary/10 text-emerald-900 before:opacity-100"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <Link
          href="/app/configuracoes/plano"
          className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-commercial transition-colors hover:bg-orange-50 hover:text-orange-700"
        >
          <Crown aria-hidden="true" className="h-4 w-4" />
          Meu Plano
        </Link>
        <Link
          href="/app/configuracoes"
          className="mt-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
        >
          <Settings aria-hidden="true" className="h-4 w-4" />
          Configurações
        </Link>
        <Link
          href="/ajuda"
          className="mt-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
        >
          <LifeBuoy aria-hidden="true" className="h-4 w-4" />
          Ajuda e suporte
        </Link>
        <form action={signoutAction}>
          <button
            type="submit"
            className="mt-1 flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
