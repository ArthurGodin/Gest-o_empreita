"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type ThemePreference,
  usePrumoTheme,
} from "@/components/theme-transition";
import { cn } from "@/lib/utils";

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: "light",
    label: "Claro",
    description: "Mantém as superfícies claras",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Escuro",
    description: "Reduz o brilho da interface",
    icon: Moon,
  },
  {
    value: "system",
    label: "Automático",
    description: "Acompanha este dispositivo",
    icon: Monitor,
  },
];

function useMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

export function ThemeIconButton({
  className,
}: {
  className?: string;
}) {
  const mounted = useMounted();
  const { resolvedTheme, isTransitioning, toggleTheme } = usePrumoTheme();
  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Ativar tema claro" : "Ativar tema escuro";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      aria-pressed={isDark}
      aria-busy={isTransitioning}
      aria-disabled={isTransitioning}
      title={label}
      onClick={toggleTheme}
      className={cn(
        "group relative shrink-0 touch-manipulation overflow-hidden rounded-full transition-[transform,background-color,border-color,color,box-shadow] duration-150 motion-safe:hover:scale-[1.08] motion-safe:active:scale-[0.94]",
        className,
      )}
    >
      <span aria-hidden="true" className="relative block h-4 w-4">
        <Moon
          className={cn(
            "absolute inset-0 transition-[opacity,transform] duration-200",
            isDark
              ? "scale-0 rotate-90 opacity-0"
              : "scale-100 rotate-0 opacity-100",
          )}
        />
        <Sun
          className={cn(
            "absolute inset-0 transition-[opacity,transform] duration-200",
            isDark
              ? "scale-100 rotate-0 opacity-100"
              : "scale-0 -rotate-90 opacity-0",
          )}
        />
      </span>
    </Button>
  );
}

export function ThemeMenuSub() {
  const mounted = useMounted();
  const { preference, isTransitioning, setPreference } = usePrumoTheme();

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-3 text-sm font-medium text-foreground">
        <Moon aria-hidden="true" className="h-4 w-4" />
        <span>Aparência</span>
      </div>
      <div
        className="mt-2 grid grid-cols-3 gap-1 rounded-md bg-muted p-1"
        role="radiogroup"
        aria-label="Tema da interface"
      >
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const selected = mounted && preference === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              title={option.label}
              disabled={isTransitioning}
              onClick={() => setPreference(option.value)}
              className={cn(
                "flex min-h-10 min-w-0 items-center justify-center gap-1 rounded px-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                selected
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span>{option.value === "system" ? "Auto" : option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ThemeSettings() {
  const mounted = useMounted();
  const { preference, isTransitioning, setPreference } = usePrumoTheme();

  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tema da interface">
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const selected = mounted && preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={isTransitioning}
            onClick={() => setPreference(option.value)}
            className={cn(
              "flex min-h-[4.75rem] items-start gap-3 rounded-lg border bg-card p-3 text-left outline-none transition-[border-color,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
              selected
                ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary))]"
                : "hover:border-primary/40 hover:bg-accent/60",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                selected
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
