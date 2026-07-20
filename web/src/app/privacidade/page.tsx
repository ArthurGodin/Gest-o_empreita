import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SupportContactLink } from "@/components/support-contact-link";

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
          Última atualização: 13/07/2026
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
              do serviço. O Prumo registra referências e estados de pagamentos,
              mas dados de cartão e a liquidação financeira são processados pelo
              Asaas.
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
              autenticação, banco de dados, armazenamento, email, análise de uso
              e pagamento, sempre na medida necessária para operar o serviço.
              Atualmente o produto utiliza serviços como Supabase, Vercel,
              Resend e Asaas; ferramentas de mensuração da Meta podem ser usadas
              quando configuradas.
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
              colaboradores. Solicitações relativas à conta Prumo podem ser
              enviadas pela{" "}
              <SupportContactLink
                source="privacy"
                className="font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                central de atendimento do Prumo
              </SupportContactLink>
              . Para orientações de uso, consulte a{" "}
              <Link
                href="/ajuda"
                className="font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Central de Ajuda
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Papéis no tratamento
            </h2>
            <p className="mt-2">
              Para dados de clientes, colaboradores e obras inseridos pela
              empresa usuária, essa empresa define as finalidades e é responsável
              pelas orientações de tratamento. O Prumo trata esses dados para
              prestar o serviço. Para dados da própria conta, segurança,
              faturamento e uso do produto, o responsável pelo Prumo define os
              tratamentos necessários à operação.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Retenção e exclusão
            </h2>
            <p className="mt-2">
              Os dados são mantidos enquanto a conta estiver ativa e pelo tempo
              necessário para cumprir obrigações legais, resolver disputas,
              prevenir fraude e proteger o serviço. Solicitações de exclusão são
              avaliadas conforme esses limites e os direitos aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              9. Atualizações
            </h2>
            <p className="mt-2">
              Esta política pode ser atualizada para refletir mudanças no
              produto, nos provedores ou nas exigências legais. A data no início
              da página indica a versão vigente.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
