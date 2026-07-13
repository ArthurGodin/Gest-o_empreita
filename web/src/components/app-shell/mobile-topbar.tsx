"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Building2,
  CreditCard,
  HardHat,
  LogOut,
  Menu as MenuIcon,
  Package,
  Settings,
} from "lucide-react";
import { signoutAction } from "@/app/(auth)/actions";

const itemClassName =
  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-slate-100 hover:text-slate-950 focus:bg-slate-100 focus:text-slate-950";

export function MobileTopbar({ companyName }: { companyName: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b bg-white/95 pt-[env(safe-area-inset-top)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur lg:hidden">
      <div className="flex h-14 min-w-0 items-center justify-between gap-2 px-3">
        <Link href="/app" className="flex min-h-11 min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-white shadow-[0_1px_2px_rgba(15,23,42,0.14)]">
            <HardHat className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-4 text-slate-950">
              Prumo
            </span>
            <span className="block max-w-[13rem] truncate text-[11px] leading-4 text-muted-foreground">
              {companyName}
            </span>
          </span>
        </Link>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Abrir menu da conta"
              title="Menu da conta"
              className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-md border bg-white text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.04)] outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MenuIcon className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-64 rounded-lg border bg-white p-1.5 shadow-lg"
            >
              <DropdownMenu.Label className="flex min-w-0 items-center gap-2 px-3 py-2">
                <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
                    Empresa
                  </span>
                  <span className="block truncate text-xs font-semibold text-slate-800">
                    {companyName}
                  </span>
                </span>
              </DropdownMenu.Label>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
              <DropdownMenu.Item asChild>
                <Link href="/app/catalogo" className={itemClassName}>
                  <Package className="h-4 w-4" />
                  Catálogo
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/app/configuracoes/plano"
                  className={itemClassName}
                >
                  <CreditCard className="h-4 w-4" />
                  Planos e assinatura
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href="/app/configuracoes" className={itemClassName}>
                  <Settings className="h-4 w-4" />
                  Configurações
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
              <form action={signoutAction}>
                <DropdownMenu.Item asChild>
                  <button type="submit" className={itemClassName}>
                    <LogOut className="h-4 w-4" />
                    Sair da conta
                  </button>
                </DropdownMenu.Item>
              </form>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
