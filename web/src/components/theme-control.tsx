"use client";

import { useSyncExternalStore } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
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
  align = "end",
  side = "bottom",
}: {
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
}) {
  const mounted = useMounted();
  const { preference, resolvedTheme, isTransitioning, setPreference } =
    usePrumoTheme();
  const ActiveIcon = !mounted
    ? Monitor
    : preference === "system"
      ? Monitor
      : resolvedTheme === "dark"
        ? Moon
        : Sun;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Alterar aparência"
          title="Aparência"
          disabled={isTransitioning}
          className={cn("shrink-0", className)}
        >
          <ActiveIcon aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          side={side}
          sideOffset={8}
          collisionPadding={12}
          className="z-[70] w-56 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-xl outline-none"
        >
          <DropdownMenu.Label className="px-3 py-2 text-xs font-semibold text-muted-foreground">
            Aparência
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={mounted ? preference : "system"}
            onValueChange={(value) => setPreference(value as ThemePreference)}
          >
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const selected = mounted && preference === option.value;
              return (
                <DropdownMenu.RadioItem
                  key={option.value}
                  value={option.value}
                  disabled={isTransitioning}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 outline-none transition-colors hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-5">
                      {option.label}
                    </span>
                    <span className="block text-xs leading-4 text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  <Check
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary",
                      selected ? "opacity-100" : "opacity-0",
                    )}
                  />
                </DropdownMenu.RadioItem>
              );
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
