"use client";

import { useState, useTransition } from "react";
import { HardHat } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCompanyAction } from "./actions";

export function OnboardingForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCompanyAction(formData);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container flex min-h-screen flex-col items-center justify-center py-8">
        <div className="mb-8 flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HardHat className="h-5 w-5" />
          </div>
          Gestão Empreita
        </div>

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Sua empresa</CardTitle>
            <CardDescription>
              Falta pouco. Conta pra gente o nome da sua empreiteira — você
              pode ajustar o resto depois.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da empresa *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Ex: Coberturas do Léo"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(11) 99999-0000"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" name="city" type="text" placeholder="São Paulo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">UF</Label>
                  <Input
                    id="state"
                    name="state"
                    type="text"
                    maxLength={2}
                    placeholder="SP"
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Criando..." : "Pronto, vamos lá"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
