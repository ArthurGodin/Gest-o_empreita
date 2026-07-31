"use client";

import { useTransition } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Building2,
  CreditCard,
  HardHat,
  LifeBuoy,
  LogOut,
  Menu as MenuIcon,
  Package,
  Presentation,
  Settings,
} from "lucide-react";
import { signoutAction } from "@/app/(auth)/actions";
import {
  useBusinessSegment,
  useBusinessVocabulary,
} from "@/components/business-segment-context";
import { ThemeMenuSub } from "@/components/theme-control";
import type { WorkspaceMode } from "@/lib/workspace-mode";

const itemClassName =
  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus:bg-accent";

export function MobileTopbar({
  companyName,
  workspaceMode,
}: {
  companyName: string;
  workspaceMode: WorkspaceMode;
}) {
  const [signingOut, startSignout] = useTransition();
  const segment = useBusinessSegment();
  const vocabulary = useBusinessVocabulary();
  const BrandIcon = segment === "construction" ? HardHat : Building2;
  const isDemo = workspaceMode === "demo";

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b bg-card/95 pt-[env(safe-area-inset-top)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur lg:hidden">
      <div className="flex h-14 min-w-0 items-center justify-between gap-2 px-3">
        <Link href="/app" className="flex min-h-11 min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(15,23,42,0.14)]">
            <BrandIcon aria-hidden="true" className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-4 text-foreground">
              Prumo
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="block max-w-[10rem] truncate text-[11px] leading-4 text-muted-foreground"
                title={companyName}
              >
                {companyName}
              </span>
              {isDemo ? (
                <span className="shrink-0 rounded-sm border border-amber-200 bg-amber-50 px-1 py-0.5 text-[8px] font-bold uppercase leading-none text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                  Demo
                </span>
              ) : null}
            </span>
          </span>
        </Link>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Abrir menu da conta"
              title="Menu da conta"
              className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-md border bg-card text-foreground shadow-[0_1px_1px_rgba(15,23,42,0.04)] outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:bg-accent data-[state=open]:bg-accent"
            >
              <MenuIcon aria-hidden="true" className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className="z-50 max-h-[calc(100dvh-5rem-env(safe-area-inset-top))] w-[min(16rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-xl"
            >
              <DropdownMenu.Label className="flex min-w-0 items-center gap-2 px-3 py-2">
                <Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
                    {vocabulary.organizationLabel}
                  </span>
                  <span
                    className="block truncate text-xs font-semibold text-foreground"
                    title={companyName}
                  >
                    {companyName}
                  </span>
                </span>
              </DropdownMenu.Label>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              {isDemo ? (
                <DropdownMenu.Item asChild>
                  <Link href="/app/demonstracao" className={itemClassName}>
                    <Presentation aria-hidden="true" className="h-4 w-4" />
                    Demonstração
                  </Link>
                </DropdownMenu.Item>
              ) : null}
              <DropdownMenu.Item asChild>
                <Link href="/app/catalogo" className={itemClassName}>
                  <Package aria-hidden="true" className="h-4 w-4" />
                  Catálogo
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/app/configuracoes/plano"
                  className={itemClassName}
                >
                  <CreditCard aria-hidden="true" className="h-4 w-4" />
                  Planos e assinatura
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href="/app/configuracoes" className={itemClassName}>
                  <Settings aria-hidden="true" className="h-4 w-4" />
                  Configurações
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href="/ajuda" className={itemClassName}>
                  <LifeBuoy aria-hidden="true" className="h-4 w-4" />
                  Ajuda e suporte
                </Link>
              </DropdownMenu.Item>
              <ThemeMenuSub />
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                disabled={signingOut}
                onSelect={(event) => {
                  event.preventDefault();
                  startSignout(async () => {
                    await signoutAction();
                  });
                }}
                className={itemClassName}
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                {signingOut ? "Saindo..." : "Sair da conta"}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
