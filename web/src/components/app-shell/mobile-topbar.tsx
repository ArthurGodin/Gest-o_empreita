"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  CreditCard,
  HardHat,
  LogOut,
  Menu as MenuIcon,
  Package,
  Settings,
} from "lucide-react";
import { signoutAction } from "@/app/(auth)/actions";

const itemClassName =
  "flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 outline-none hover:bg-emerald-50 hover:text-emerald-900 focus:bg-emerald-50 focus:text-emerald-900";

export function MobileTopbar({ companyName }: { companyName: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/70 bg-white/95 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur md:hidden">
      <div className="flex h-14 min-w-0 items-center justify-between gap-2 px-3">
        <Link href="/app" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <HardHat className="h-4 w-4" />
          </span>
          <span className="truncate text-sm font-semibold text-slate-950">
            {companyName}
          </span>
        </Link>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Abrir menu da conta"
              className="inline-flex h-9 shrink-0 touch-manipulation items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm outline-none hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <MenuIcon className="h-4 w-4" />
              Menu
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl"
            >
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
