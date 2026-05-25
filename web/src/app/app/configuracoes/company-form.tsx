"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCompanyAction } from "./actions";
import type { CompanyFull } from "@/lib/queries/company-settings";

export function CompanyForm({ company }: { company: CompanyFull }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: (formData.get("name") as string) ?? "",
      legal_name: (formData.get("legal_name") as string) ?? "",
      cnpj: (formData.get("cnpj") as string) ?? "",
      phone: (formData.get("phone") as string) ?? "",
      email: (formData.get("email") as string) ?? "",
      address: (formData.get("address") as string) ?? "",
      city: (formData.get("city") as string) ?? "",
      state: (formData.get("state") as string) ?? "",
      zip_code: (formData.get("zip_code") as string) ?? "",
    };

    startTransition(async () => {
      const result = await updateCompanyAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-muted-foreground">
          Identificação
        </legend>

        <div className="space-y-2">
          <Label htmlFor="name">
            Nome da empresa <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={company.name}
            placeholder="Coberturas do Léo"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="legal_name">Razão social</Label>
            <Input
              id="legal_name"
              name="legal_name"
              defaultValue={company.legal_name ?? ""}
              placeholder="Coberturas do Léo LTDA"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              name="cnpj"
              inputMode="numeric"
              defaultValue={company.cnpj ?? ""}
              placeholder="00.000.000/0001-00"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-muted-foreground">
          Contato
        </legend>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone / WhatsApp</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={company.phone ?? ""}
              placeholder="(86) 99999-0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={company.email ?? ""}
              placeholder="contato@empresa.com.br"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-muted-foreground">
          Endereço
        </legend>

        <div className="space-y-2">
          <Label htmlFor="address">Rua, número e bairro</Label>
          <Input
            id="address"
            name="address"
            defaultValue={company.address ?? ""}
            placeholder="Av. Frei Serafim, 123 — Centro"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto_140px]">
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              name="city"
              defaultValue={company.city ?? ""}
              placeholder="Teresina"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">UF</Label>
            <Input
              id="state"
              name="state"
              maxLength={2}
              defaultValue={company.state ?? ""}
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
              defaultValue={company.zip_code ?? ""}
              placeholder="64000-000"
            />
          </div>
        </div>
      </fieldset>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100">
          ✓ Dados salvos.
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
