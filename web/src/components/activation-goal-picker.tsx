"use client";

import {
  ClipboardList,
  FileCheck2,
  FolderKanban,
  Handshake,
  LineChart,
  Check,
} from "lucide-react";
import {
  getActivationGoalOptions,
  type ActivationGoal,
} from "@/lib/activation-goals";
import type { BusinessSegment } from "@/lib/business-segment";
import { cn } from "@/lib/utils";

const GOAL_ICONS = {
  sell: Handshake,
  existing_project: FolderKanban,
  client_briefing: ClipboardList,
  deliverables: FileCheck2,
  execution_control: LineChart,
} as const;

interface ActivationGoalPickerProps {
  segment: BusinessSegment;
  value?: ActivationGoal;
  onValueChange: (value: ActivationGoal) => void;
  error?: string;
  disabled?: boolean;
  idPrefix: string;
}

export function ActivationGoalPicker({
  segment,
  value,
  onValueChange,
  error,
  disabled,
  idPrefix,
}: ActivationGoalPickerProps) {
  const errorId = error ? `${idPrefix}-error` : undefined;

  return (
    <fieldset
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={errorId}
      disabled={disabled}
      className="space-y-3"
    >
      <legend className="sr-only">O que você quer resolver primeiro?</legend>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {getActivationGoalOptions(segment).map((option) => {
          const Icon = GOAL_ICONS[option.value];
          const selected = value === option.value;

          return (
            <label
              key={option.value}
              className={cn(
                "relative min-w-0 cursor-pointer rounded-lg border bg-card transition-[border-color,background-color,box-shadow] active:bg-muted/40",
                selected
                  ? "border-primary bg-primary/[0.045] shadow-[0_0_0_1px_hsl(var(--primary))]"
                  : "border-border hover:border-primary/35 hover:bg-muted/40",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                id={`${idPrefix}-${option.value}`}
                type="radio"
                name="activation_goal"
                value={option.value}
                checked={selected}
                onChange={() => onValueChange(option.value)}
                aria-describedby={errorId}
                className="peer sr-only"
              />
              <span className="flex min-h-[92px] gap-3 p-3 outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-ring sm:min-h-[148px] sm:flex-col">
                <span className="flex shrink-0 items-start justify-between gap-2 sm:w-full">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "hidden h-5 w-5 items-center justify-center rounded-full border sm:flex",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-transparent",
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-5 text-foreground">
                    {option.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {error ? (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
