import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, HardHat, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HardHat className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">Gestão Empreita</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Começar grátis</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Pare de perder dinheiro com{" "}
            <span className="text-primary">orçamento no caderno</span>.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            O sistema feito para empreiteiros de cobertura e construção civil
            controlarem orçamentos, obras, equipe e cobranças — tudo no celular,
            simples como WhatsApp.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">
                Testar grátis por 14 dias <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Sem cartão de crédito.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<FileText className="h-6 w-6" />}
            title="Orçamento profissional"
            description="Monte um orçamento bonito em 5 minutos, envie por link e o cliente aprova no celular dele."
          />
          <FeatureCard
            icon={<HardHat className="h-6 w-6" />}
            title="Obra no controle"
            description="Etapas, prazo, fotos do dia a dia e custo real — você sabe exatamente onde sua obra está."
          />
          <FeatureCard
            icon={<Wallet className="h-6 w-6" />}
            title="Cobrança fácil"
            description="Pix e boleto em um clique. Cliente paga, você recebe sem ter que ficar correndo atrás."
          />
        </div>
      </section>

      {/* Why */}
      <section className="border-t bg-muted/30 py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold md:text-3xl">
              Feito para quem está na obra, não no escritório.
            </h2>
            <ul className="mt-6 space-y-3 text-base">
              {[
                "Funciona no celular do encarregado, mesmo com sinal ruim",
                "Linguagem do setor: obra, peão, material, cobrança — sem termo de empresa grande",
                "Onboarding em 5 minutos, sem precisar de treinamento",
                "Você só paga quando o cliente paga você",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Gestão Empreita. Feito com suor por quem
          entende de obra.
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
