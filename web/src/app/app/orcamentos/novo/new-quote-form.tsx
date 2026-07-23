"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createQuoteAction } from "../actions/create";
import type { Customer } from "@/lib/queries/customers";
import { trackProductEvent } from "@/lib/product-analytics";
import type { QuoteTemplate } from "@/lib/quote-templates";
import {
  useBusinessSegment,
  useBusinessVocabulary,
} from "@/components/business-segment-context";
import { QuoteTemplatePicker } from "./quote-template-picker";

interface NewQuoteFormProps {
  customers: Customer[];
  templates: readonly QuoteTemplate[];
  selectedCustomerId?: string;
}

export function NewQuoteForm({
  customers,
  templates,
  selectedCustomerId,
}: NewQuoteFormProps) {
  const segment = useBusinessSegment();
  const vocabulary = useBusinessVocabulary();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    customer_id?: string;
    title?: string;
    template_id?: string;
  }>({});
  const [customerId, setCustomerId] = useState(
    selectedCustomerId ?? customers[0]?.id ?? "",
  );
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");

  function selectTemplate(nextTemplateId: string) {
    const previousTemplate = templates.find(
      (template) => template.id === templateId,
    );
    const nextTemplate = templates.find(
      (template) => template.id === nextTemplateId,
    );

    setTitle((current) =>
      !current.trim() || current === previousTemplate?.title
        ? nextTemplate?.title ?? ""
        : current,
    );
    setTemplateId(nextTemplateId);
    setFieldErrors((current) => ({
      ...current,
      template_id: undefined,
    }));
    setError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!customerId) {
      setFieldErrors({
        customer_id: `Escolha o cliente ${segment === "construction" ? "deste orçamento" : "desta proposta"}.`,
      });
      window.requestAnimationFrame(() => {
        document.getElementById("customer")?.focus();
      });
      return;
    }

    startTransition(async () => {
      const result = await createQuoteAction({
        customer_id: customerId,
        title: title.trim(),
        template_id: templateId,
      });

      if (!result.ok) {
        setError(result.error);
        if (result.fieldErrors) {
          setFieldErrors({
            customer_id: result.fieldErrors.customer_id?.[0],
            title: result.fieldErrors.title?.[0],
            template_id: result.fieldErrors.template_id?.[0],
          });
        }
        return;
      }

      trackProductEvent("quote_created", {
        business_segment: segment,
        has_title: Boolean(title.trim()),
        customers_available: customers.length,
        quote_template: templateId || "blank",
      });
      router.push(`/app/orcamentos/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-lg border bg-card p-4 sm:p-5">
      <QuoteTemplatePicker
        templates={templates}
        value={templateId}
        onValueChange={selectTemplate}
        disabled={pending}
        error={fieldErrors.template_id}
      />

      <div className="border-t pt-5">
        <div className="space-y-2">
          <Label htmlFor="customer">
            Cliente <span className="text-destructive">*</span>
          </Label>
          <select
            id="customer"
            name="customer_id"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setFieldErrors((current) => ({
                ...current,
                customer_id: undefined,
              }));
            }}
            required
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.customer_id) || undefined}
            aria-describedby={
              fieldErrors.customer_id ? "customer-error" : undefined
            }
            className={`flex h-11 w-full rounded-md border bg-card px-3 py-2 text-base ring-offset-background transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
              fieldErrors.customer_id ? "border-destructive" : "border-input"
            }`}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.city ? ` — ${c.city}` : ""}
                {c.state ? `/${c.state}` : ""}
              </option>
            ))}
          </select>
          {fieldErrors.customer_id && (
            <p id="customer-error" className="text-xs text-destructive">
              {fieldErrors.customer_id}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">
          Título{" "}
          {segment === "construction"
            ? "do orçamento"
            : "da proposta"}
        </Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setFieldErrors((current) => ({ ...current, title: undefined }));
          }}
          placeholder={
            segment === "construction"
              ? "Ex.: Reforma da casa de Maria"
              : "Ex.: Projeto residencial de Maria"
          }
          maxLength={200}
          autoComplete="off"
          aria-invalid={Boolean(fieldErrors.title) || undefined}
          aria-describedby={fieldErrors.title ? "title-error" : "title-help"}
          className={fieldErrors.title ? "border-destructive" : undefined}
        />
        {fieldErrors.title ? (
          <p id="title-error" className="text-xs text-destructive">
            {fieldErrors.title}
          </p>
        ) : (
          <p id="title-help" className="text-xs text-muted-foreground">
            Você poderá ajustar no editor. Se deixar vazio, o Prumo usa um
            título padrão.
          </p>
        )}
      </div>

      {error && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm text-amber-800 shadow-sm dark:text-amber-500"
        >
          <p className="mb-3 font-medium">{error}</p>
          {error.toLowerCase().includes("limite") && (
            <Button asChild className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white">
              <Link href="/app/configuracoes/plano">
                Ver planos e assinar Pro
              </Link>
            </Button>
          )}
        </div>
      )}

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <Button asChild variant="outline">
          <Link
            href="/app/orcamentos"
            aria-disabled={pending}
            className={pending ? "pointer-events-none" : undefined}
            tabIndex={pending ? -1 : undefined}
          >
            Cancelar
          </Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Criando…" : vocabulary.createQuoteLabel}
        </Button>
      </div>
    </form>
  );
}
