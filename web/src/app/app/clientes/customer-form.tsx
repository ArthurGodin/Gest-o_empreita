"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createCustomerAction,
  updateCustomerAction,
  type CustomerActionResult,
} from "./actions";
import type { Customer } from "@/lib/queries/customers";

interface CustomerFormProps {
  /** Quando definido, modo edição. Sem isso, modo criação. */
  customer?: Customer;
  /** Para onde voltar/ir após salvar. */
  cancelHref?: string;
}

export function CustomerForm({
  customer,
  cancelHref = "/app/clientes",
}: CustomerFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const isEdit = Boolean(customer);

  function onSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result: CustomerActionResult = isEdit
        ? await updateCustomerAction(customer!.id, formData)
        : await createCustomerAction(formData);

      if (!result.ok) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      router.push(`/app/clientes/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      {/* ── Dados básicos ─────────────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-muted-foreground">
          Dados do cliente
        </legend>

        <div className="space-y-2">
          <Label htmlFor="name">
            Nome <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={customer?.name ?? ""}
            placeholder="João da Silva ou Construtora Silva LTDA"
            autoFocus={!isEdit}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name && (
            <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone / WhatsApp</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={customer?.phone ?? ""}
              placeholder="(86) 99999-0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={customer?.email ?? ""}
              placeholder="cliente@exemplo.com"
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="document">CPF / CNPJ</Label>
          <Input
            id="document"
            name="document"
            inputMode="numeric"
            defaultValue={customer?.document ?? ""}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            aria-invalid={Boolean(fieldErrors.document)}
          />
          {fieldErrors.document && (
            <p className="text-sm text-destructive">{fieldErrors.document[0]}</p>
          )}
        </div>
      </fieldset>

      {/* ── Endereço ──────────────────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-muted-foreground">
          Endereço (opcional)
        </legend>

        <div className="space-y-2">
          <Label htmlFor="address">Rua, número e bairro</Label>
          <Input
            id="address"
            name="address"
            defaultValue={customer?.address ?? ""}
            placeholder="Rua das Flores, 123 — Centro"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_140px]">
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              name="city"
              defaultValue={customer?.city ?? ""}
              placeholder="Teresina"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">UF</Label>
            <Input
              id="state"
              name="state"
              maxLength={2}
              defaultValue={customer?.state ?? ""}
              placeholder="PI"
              className="w-20 uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip_code">CEP</Label>
            <Input
              id="zip_code"
              name="zip_code"
              inputMode="numeric"
              defaultValue={customer?.zip_code ?? ""}
              placeholder="64000-000"
            />
          </div>
        </div>
      </fieldset>

      {/* ── Notas ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={customer?.notes ?? ""}
          placeholder="Anotações internas sobre o cliente, preferências, histórico..."
          rows={3}
        />
      </div>

      {/* ── Erro geral ────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Ações ─────────────────────────────────────────────────── */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link
            href={cancelHref}
            aria-disabled={pending}
            className={pending ? "pointer-events-none" : undefined}
            tabIndex={pending ? -1 : undefined}
          >
            Cancelar
          </Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Salvando…"
            : isEdit
              ? "Salvar alterações"
              : "Cadastrar cliente"}
        </Button>
      </div>
    </form>
  );
}
