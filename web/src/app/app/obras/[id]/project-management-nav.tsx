import {
  Banknote,
  BookOpenText,
  Clock3,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";

const MANAGEMENT_SECTIONS: Array<{
  hash: string;
  icon: LucideIcon;
  label: string;
}> = [
  { hash: "cobranca", icon: Banknote, label: "Cobrança" },
  { hash: "diario", icon: BookOpenText, label: "Diário" },
  { hash: "custos", icon: ReceiptText, label: "Custos" },
  { hash: "equipe", icon: Clock3, label: "Equipe" },
];

export function ProjectManagementNav() {
  return (
    <nav
      aria-label="Seções da gestão"
      className="-mx-1 touch-pan-x overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex min-w-max gap-2">
        {MANAGEMENT_SECTIONS.map(({ hash, icon: Icon, label }) => (
          <a
            key={hash}
            href={`#${hash}`}
            className="inline-flex h-10 touch-manipulation items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
