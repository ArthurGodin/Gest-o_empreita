"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createQuoteAction } from "../actions";
import type { Customer } from "@/lib/queries/customers";

interface NewQuoteFormProps {
  customers: Customer[];
}

export function NewQuoteForm({ customers }: NewQuoteFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [title, setTitle] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError("Escolha um cliente.");
      return;
    }

    startTransition(async () => {
      const result = await createQuoteAction({
        customer_id: customerId,
        title: title.trim() || "Novo orçamento",
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/app/orcamentos/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="customer">
          Cliente <span className="text-destructive">*</span>
        </Label>
        <select
          id="customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          required
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.city ? ` — ${c.city}` : ""}
              {c.state ? `/${c.state}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Título do orçamento</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Cobertura nova — Casa Maria Santos"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Você pode editar depois. Se deixar vazio, viramos &quot;Novo orçamento&quot;.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/app/orcamentos")}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Criando..." : "Criar orçamento"}
        </Button>
      </div>
    </form>
  );
}
