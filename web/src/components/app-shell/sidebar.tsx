"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileText,
  FolderKanban,
  HardHat,
  Home,
  LifeBuoy,
  LogOut,
  Package,
  Presentation,
  Settings,
  Users,
  Wallet,
  Crown,
} from "lucide-react";
import { signoutAction } from "@/app/(auth)/actions";
import {
  useBusinessSegment,
  useBusinessVocabulary,
} from "@/components/business-segment-context";
import { ThemeIconButton } from "@/components/theme-control";
import { cn } from "@/lib/utils";
import type { WorkspaceMode } from "@/lib/workspace-mode";

export function Sidebar({
  companyName,
  workspaceMode,
}: {
  companyName: string;
  workspaceMode: WorkspaceMode;
}) {
  const pathname = usePathname();
  const segment = useBusinessSegment();
  const vocabulary = useBusinessVocabulary();
  const ProjectIcon = segment === "construction" ? HardHat : FolderKanban;
  const isDemo = workspaceMode === "demo";
  const navItems = [
    { href: "/app", label: "Início", icon: Home },
    ...(isDemo
      ? [
          {
            href: "/app/demonstracao",
            label: "Demonstração",
            icon: Presentation,
          },
        ]
      : []),
    {
      href: "/app/orcamentos",
      label: vocabulary.quotePlural,
      icon: FileText,
    },
    {
      href: "/app/obras",
      label: vocabulary.projectPlural,
      icon: ProjectIcon,
    },
    { href: "/app/clientes", label: "Clientes", icon: Users },
    { href: "/app/catalogo", label: "Catálogo", icon: Package },
    { href: "/app/financeiro", label: "Financeiro", icon: Wallet },
  ];

  return (
    <aside className="hidden border-r bg-card lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-56 lg:shrink-0 lg:flex-col">
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/app" className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(15,23,42,0.16)]">
            <HardHat aria-hidden="true" className="h-4 w-4" />
          </div>
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-4 text-foreground">
              Prumo
            </span>
            <span className="block text-[11px] leading-4 text-muted-foreground">
              {vocabulary.appDescriptor}
            </span>
          </span>
        </Link>
      </div>

      <div className="px-3 pt-3">
        <div className="flex min-w-0 items-center gap-2.5 rounded-md border bg-muted/70 px-3 py-2.5">
          <Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
              {vocabulary.organizationLabel}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="block min-w-0 truncate text-xs font-semibold text-foreground"
                title={companyName}
              >
                {companyName}
              </span>
              {isDemo ? (
                <span className="shrink-0 rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                  Demo
                </span>
              ) : null}
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
                  ? "bg-primary/10 text-primary before:opacity-100"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="mb-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground">
          <span className="min-w-0 flex-1">Aparência</span>
          <ThemeIconButton className="h-9 w-9 border-transparent bg-transparent shadow-none" />
        </div>
        <Link
          href="/app/configuracoes/plano"
          className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-commercial transition-colors hover:bg-commercial/10"
        >
          <Crown aria-hidden="true" className="h-4 w-4" />
          Meu Plano
        </Link>
        <Link
          href="/app/configuracoes"
          className="mt-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Settings aria-hidden="true" className="h-4 w-4" />
          Configurações
        </Link>
        <Link
          href="/ajuda"
          className="mt-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LifeBuoy aria-hidden="true" className="h-4 w-4" />
          Ajuda e suporte
        </Link>
        <form action={signoutAction}>
          <button
            type="submit"
            className="mt-1 flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
