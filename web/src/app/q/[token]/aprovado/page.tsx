import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBRL, formatDateBR } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ApprovedData {
  number: string;
  title: string;
  total_cents: number;
  approved_at: string | null;
  share_token: string;
  company: { name: string };
  approvals: Array<{ signer_name: string; created_at: string; action: string }>;
}

export default async function ApprovedPage({
  params,
}: {
  params: { token: string };
}) {
  if (params.token.length < 32) notFound();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quotes")
    .select(
      `
      number, title, total_cents, approved_at, share_token,
      company:companies(name),
      approvals:quote_approvals(signer_name, created_at, action)
    `,
    )
    .eq("share_token", params.token)
    .maybeSingle();

  if (error || !data) notFound();
  const quote = data as unknown as ApprovedData;

  const approval = quote.approvals
    .filter((a) => a.action === "approved")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
          <CheckCircle2 className="h-12 w-12" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">Orçamento aprovado!</h1>
          <p className="mt-2 text-muted-foreground">
            {approval ? (
              <>
                Obrigado, <strong>{approval.signer_name}</strong>. Sua aprovação
                foi registrada em {formatDateBR(approval.created_at)}.
              </>
            ) : (
              "Sua aprovação foi registrada."
            )}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 text-left">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Resumo
          </div>
          <div className="mt-2 font-mono text-sm text-muted-foreground">
            {quote.number}
          </div>
          <div className="font-medium">{quote.title}</div>
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Total aprovado</span>
            <span className="text-2xl font-bold text-primary">
              {formatBRL(quote.total_cents / 100)}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          <strong>{quote.company.name}</strong> recebeu uma notificação por
          email e vai entrar em contato pra acertar os detalhes da obra.
        </p>

        <Link
          href={`/q/${params.token}`}
          className="inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          Ver detalhes do orçamento
        </Link>
      </div>
    </main>
  );
}
