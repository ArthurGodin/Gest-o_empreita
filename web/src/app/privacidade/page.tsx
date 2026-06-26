import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade - Prumo",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <article className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="mt-8 text-3xl font-bold tracking-normal">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: 01/06/2026
        </p>

        <div className="mt-8 space-y-6 leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Dados que tratamos
            </h2>
            <p className="mt-2">
              Podemos tratar dados de conta, empresa, clientes, orçamentos,
              obras, fotos, custos, registros de ponto, informações de contato e
              dados técnicos necessários para autenticação, segurança e operação
              do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Para que usamos
            </h2>
            <p className="mt-2">
              Usamos dados para entregar as funcionalidades do produto, manter a
              conta segura, gerar orçamentos e PDFs, exibir andamento de obras,
              enviar notificações transacionais e melhorar a experiência.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. Compartilhamento
            </h2>
            <p className="mt-2">
              Dados podem ser processados por provedores de infraestrutura,
              autenticação, banco de dados, armazenamento, email e pagamento,
              sempre na medida necessária para operar o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Link público
            </h2>
            <p className="mt-2">
              Orçamentos e andamentos compartilhados por link público podem ser
              acessados por quem possuir o link. A empresa usuária deve enviar
              esses links apenas às pessoas autorizadas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Segurança
            </h2>
            <p className="mt-2">
              O produto usa isolamento por empresa, autenticação e regras de
              acesso no banco. Mesmo assim, nenhuma plataforma é imune a riscos.
              Recomenda-se controlar quem tem acesso à conta e remover usuários
              que não façam mais parte da operação.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Direitos do titular
            </h2>
            <p className="mt-2">
              Titulares podem solicitar acesso, correção ou exclusão de dados,
              conforme aplicável. A empresa que cadastrou os dados é a primeira
              responsável por avaliar solicitações dos seus próprios clientes e
              colaboradores.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Revisão jurídica
            </h2>
            <p className="mt-2">
              Esta política é uma versão operacional inicial. Antes de escalar
              vendas, deve ser revisada por assessoria jurídica conforme o modelo
              comercial final.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
