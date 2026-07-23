"use client";

import { Check, FilePlus2, Sparkles } from "lucide-react";
import type { QuoteTemplate } from "@/lib/quote-templates";
import { cn } from "@/lib/utils";

interface QuoteTemplatePickerProps {
  templates: readonly QuoteTemplate[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function QuoteTemplatePicker({
  templates,
  value,
  onValueChange,
  disabled,
  error,
}: QuoteTemplatePickerProps) {
  const options = [
    {
      id: "",
      name: "Começar em branco",
      summary: "Monte o escopo do zero no editor.",
      itemCount: 0,
    },
    ...templates.map((template) => ({
      id: template.id,
      name: template.name,
      summary: template.summary,
      itemCount: template.items.length,
    })),
  ];

  return (
    <fieldset
      className="space-y-3"
      disabled={disabled}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={error ? "quote-template-error" : undefined}
    >
      <div>
        <legend className="text-sm font-semibold text-foreground">
          Como quer começar?
        </legend>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          O modelo organiza o escopo, mas deixa todos os preços para você revisar.
        </p>
      </div>

      <div className="space-y-2">
        {options.map((option) => {
          const selected = value === option.id;
          const Icon = option.id ? Sparkles : FilePlus2;

          return (
            <label
              key={option.id || "blank"}
              className={cn(
                "block cursor-pointer rounded-md border bg-card transition-[border-color,background-color,box-shadow] active:bg-muted/40",
                selected
                  ? "border-primary bg-primary/[0.045] shadow-[0_0_0_1px_hsl(var(--primary))]"
                  : "hover:border-slate-300 hover:bg-muted/20",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="template_id"
                value={option.id}
                checked={selected}
                onChange={() => onValueChange(option.id)}
                className="peer sr-only"
              />
              <span className="flex min-h-16 items-center gap-3 px-3 py-2.5 peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-ring">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {option.name}
                  </span>
                  <span className="block text-xs leading-5 text-muted-foreground">
                    {option.summary}
                    {option.itemCount > 0
                      ? ` · ${option.itemCount} itens editáveis`
                      : ""}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-slate-200 text-transparent",
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {error ? (
        <p
          id="quote-template-error"
          className="text-xs text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
