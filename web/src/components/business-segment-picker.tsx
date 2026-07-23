"use client";

import {
  Building2,
  Check,
  HardHat,
  Palette,
  Ruler,
} from "lucide-react";
import {
  BUSINESS_SEGMENT_OPTIONS,
  type BusinessSegment,
} from "@/lib/business-segment";
import { cn } from "@/lib/utils";

const SEGMENT_ICONS = {
  architecture: Building2,
  interiors: Palette,
  engineering: Ruler,
  construction: HardHat,
} as const;

interface BusinessSegmentPickerProps {
  value?: BusinessSegment;
  onValueChange: (value: BusinessSegment) => void;
  name?: string;
  legend?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  idPrefix: string;
}

export function BusinessSegmentPicker({
  value,
  onValueChange,
  name = "business_segment",
  legend = "Como você trabalha?",
  description,
  error,
  disabled,
  idPrefix,
}: BusinessSegmentPickerProps) {
  const descriptionId = description ? `${idPrefix}-description` : undefined;
  const errorId = error ? `${idPrefix}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");

  return (
    <fieldset
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={describedBy || undefined}
      disabled={disabled}
      className="space-y-3"
    >
      <div>
        <legend className="text-sm font-semibold text-foreground">
          {legend}
        </legend>
        {description ? (
          <p
            id={descriptionId}
            className="mt-1 text-xs leading-5 text-muted-foreground"
          >
            {description}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {BUSINESS_SEGMENT_OPTIONS.map((option) => {
          const Icon = SEGMENT_ICONS[option.value];
          const selected = value === option.value;

          return (
            <label
              key={option.value}
              className={cn(
                "relative min-w-0 cursor-pointer rounded-lg border bg-card transition-[border-color,background-color,box-shadow] active:bg-muted/40",
                selected
                  ? "border-primary bg-primary/[0.045] shadow-[0_0_0_1px_hsl(var(--primary))]"
                  : "border-border hover:border-slate-300 hover:bg-muted/20",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                id={`${idPrefix}-${option.value}`}
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onValueChange(option.value)}
                aria-describedby={describedBy || undefined}
                className="peer sr-only"
              />
              <span className="flex min-h-[116px] flex-col p-3 outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-ring">
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-slate-200 text-transparent",
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                </span>
                <span className="mt-2 block text-sm font-semibold leading-5 text-foreground">
                  {option.shortLabel}
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground sm:text-xs">
                  {option.description}
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
