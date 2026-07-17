"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  QUOTE_DRAFT_LIMITS,
  type QuoteDraftField,
} from "./quote-draft";
import type { Customer } from "@/lib/queries/customers";

interface QuoteDetailsSectionProps {
  customers: Customer[];
  title: string;
  description: string;
  customerId: string;
  validUntil: string;
  errors: Partial<Record<QuoteDraftField, string>>;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCustomerChange: (value: string) => void;
  onValidUntilChange: (value: string) => void;
}

export function QuoteDetailsSection({
  customers,
  title,
  description,
  customerId,
  validUntil,
  errors,
  onTitleChange,
  onDescriptionChange,
  onCustomerChange,
  onValidUntilChange,
}: QuoteDetailsSectionProps) {
  return (
    <section className="rounded-lg border bg-card p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">
        Dados do orçamento
      </h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">
            Título <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            required
            placeholder="Ex: Cobertura nova — Casa Maria Santos…"
            maxLength={QUOTE_DRAFT_LIMITS.title}
            autoComplete="off"
            aria-invalid={Boolean(errors.title) || undefined}
            aria-describedby={errors.title ? "title-error" : undefined}
            className={errors.title ? "border-destructive" : undefined}
          />
          {errors.title && (
            <p id="title-error" className="text-xs text-destructive">
              {errors.title}
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer">
              Cliente <span className="text-destructive">*</span>
            </Label>
            <select
              id="customer"
              name="customer_id"
              value={customerId}
              onChange={(event) => onCustomerChange(event.target.value)}
              required
              autoComplete="off"
              aria-invalid={Boolean(errors.customer_id) || undefined}
              aria-describedby={
                errors.customer_id ? "customer-error" : undefined
              }
              className={`flex h-11 w-full rounded-md border bg-card px-3 py-2 text-base ring-offset-background transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 md:text-sm ${
                errors.customer_id ? "border-destructive" : "border-input"
              }`}
            >
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.city ? ` — ${customer.city}` : ""}
                  {customer.state ? `/${customer.state}` : ""}
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <p id="customer-error" className="text-xs text-destructive">
                {errors.customer_id}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="valid_until">Válido até</Label>
            <Input
              id="valid_until"
              name="valid_until"
              type="date"
              value={validUntil}
              onChange={(event) => onValidUntilChange(event.target.value)}
              autoComplete="off"
              aria-invalid={Boolean(errors.valid_until) || undefined}
              aria-describedby={
                errors.valid_until ? "valid-until-error" : undefined
              }
              className={errors.valid_until ? "border-destructive" : undefined}
            />
            {errors.valid_until && (
              <p id="valid-until-error" className="text-xs text-destructive">
                {errors.valid_until}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Textarea
            id="description"
            name="description"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Detalhes sobre o serviço, escopo, condições…"
            rows={2}
            maxLength={QUOTE_DRAFT_LIMITS.description}
            autoComplete="off"
            aria-invalid={Boolean(errors.description) || undefined}
            aria-describedby={
              errors.description ? "description-error" : undefined
            }
            className={errors.description ? "border-destructive" : undefined}
          />
          {errors.description && (
            <p id="description-error" className="text-xs text-destructive">
              {errors.description}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
