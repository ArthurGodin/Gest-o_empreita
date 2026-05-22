import Link from "next/link";
import { FileText, HardHat, Plus, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="container py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Início</h1>
          <p className="text-sm text-muted-foreground">
            Bem-vindo. Por onde quer começar hoje?
          </p>
        </div>
        <Button asChild>
          <Link href="/app/orcamentos/novo">
            <Plus className="h-4 w-4" />
            Novo orçamento
          </Link>
        </Button>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <QuickAction
          href="/app/orcamentos/novo"
          icon={<FileText className="h-6 w-6" />}
          title="Criar orçamento"
          description="Monte um orçamento profissional em poucos minutos"
        />
        <QuickAction
          href="/app/clientes/novo"
          icon={<Users className="h-6 w-6" />}
          title="Cadastrar cliente"
          description="Adicione um cliente novo à sua agenda"
        />
        <QuickAction
          href="/app/obras"
          icon={<HardHat className="h-6 w-6" />}
          title="Ver obras"
          description="Acompanhe o que está rolando hoje"
        />
      </div>

      {/* Empty state */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Ainda não tem orçamentos por aqui</CardTitle>
          <CardDescription>
            Crie o primeiro e mande para um cliente. Quando ele aprovar pelo
            link, vira uma obra com um clique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/app/orcamentos/novo">
              <Plus className="h-4 w-4" />
              Criar primeiro orçamento
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
