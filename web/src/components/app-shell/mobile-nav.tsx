"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, HardHat, Home, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/app/orcamentos", label: "Orçam.", icon: FileText },
  { href: "/app/obras", label: "Obras", icon: HardHat },
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/financeiro", label: "Finan.", icon: Wallet },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card md:hidden">
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
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
