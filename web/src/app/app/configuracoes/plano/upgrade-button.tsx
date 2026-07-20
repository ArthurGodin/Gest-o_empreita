"use client";

import Link from "next/link";
import { ArrowRight, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_DEFINITIONS, type PaidPlan } from "@/lib/plans";
import { cn } from "@/lib/utils";

interface UpgradeButtonProps {
  plan: PaidPlan;
  className?: string;
}

export function UpgradeButton({ plan, className }: UpgradeButtonProps) {
  const definition = PLAN_DEFINITIONS[plan];
  const Icon = plan === "ultimate" ? Crown : Zap;

  return (
    <Button
      asChild
      size="lg"
      className={cn(
        "w-full border-0 text-white",
        plan === "ultimate"
          ? "bg-slate-950 shadow-slate-900/15 hover:bg-slate-800"
          : "bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700",
        className,
      )}
    >
      <Link href={`/app/configuracoes/plano/checkout?plan=${plan}`}>
        <Icon className="h-5 w-5" />
        {definition.cta}
        <ArrowRight className="h-5 w-5" />
      </Link>
    </Button>
  );
}
