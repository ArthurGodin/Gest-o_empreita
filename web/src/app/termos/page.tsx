import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Termos de Uso - Prumo",
};

export default function TermsPage() {
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
          Termos de Uso
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: 13/07/2026
        </p>

        <div className="mt-8 space-y-6 leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Uso do produto
            </h2>
            <p className="mt-2">
              O Prumo é uma ferramenta para gestão operacional de
              orçamentos, clientes, obras, diários, custos e informações de
              equipe. O usuário é responsável pela veracidade dos dados
              cadastrados e pelo uso adequado das informações geradas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Conta e segurança
            </h2>
            <p className="mt-2">
              Cada empresa deve manter seus acessos protegidos. Atividades
              realizadas por usuários autorizados dentro da conta serão tratadas
              como atividades da própria empresa.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. Dados cadastrados
            </h2>
            <p className="mt-2">
              Os dados de clientes, obras, orçamentos, fotos e custos pertencem
              à empresa que os cadastrou. O sistema usa essas informações para
              prestar o serviço contratado e melhorar a experiência do produto.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Planos e pagamento
            </h2>
            <p className="mt-2">
              O Plano Grátis possui os limites informados na página de preços.
              Os planos Pro e Ultimate são assinaturas mensais processadas pelo
              Asaas e liberadas após a confirmação do pagamento. Falha,
              estorno, chargeback ou atraso da assinatura ativa pode suspender
              os recursos pagos e retornar a conta ao Plano Grátis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Cancelamento
            </h2>
            <p className="mt-2">
              O proprietário da empresa pode cancelar a assinatura na tela de
              planos. A recorrência é encerrada e a conta volta ao Plano Grátis
              imediatamente. O cancelamento comum não gera reembolso
              automático, sem prejuízo dos direitos assegurados pela legislação
              aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Disponibilidade
            </h2>
            <p className="mt-2">
              Buscamos manter o serviço estável, mas interrupções podem ocorrer
              por manutenção, falhas de infraestrutura ou serviços terceiros.
              Funcionalidades em desenvolvimento podem mudar conforme validação
              com clientes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Limitação
            </h2>
            <p className="mt-2">
              O sistema apoia decisões de gestão, mas não substitui contabilidade,
              assessoria jurídica, engenharia, segurança do trabalho ou auditoria
              profissional.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Contato
            </h2>
            <p className="mt-2">
              Dúvidas, solicitações de cancelamento relacionadas a direitos
              legais e questões sobre estes termos devem ser enviadas pelo canal
              de atendimento informado durante a contratação do Prumo.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
