import Link from "next/link";
import { AlertCircle, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicQuoteNotFound() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-12">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Gestão Empreita
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              Link indisponível
            </h1>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm leading-6 text-muted-foreground">
            Este orçamento pode ter expirado, sido substituído por um link novo
            ou digitado com algum caractere faltando. Peça ao prestador o link
            atualizado antes de aprovar, recusar ou baixar o PDF.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao início
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Abrir WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
