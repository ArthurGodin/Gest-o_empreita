import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { formatPhone, whatsappShareLink } from "@/lib/format";

export const dynamic = "force-dynamic";

interface ApprovedData {
  number: string;
  title: string;
  total_cents: number;
  approved_at: string | null;
  share_token: string;
  company: {
    name: string;
    phone: string | null;
    logo_url: string | null;
    city: string | null;
    state: string | null;
  };
  customer: {
    name: string;
    city: string | null;
    state: string | null;
  } | null;
  approvals: Array<{ signer_name: string; created_at: string; action: string }>;
}

export default async function ApprovedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (token.length < 32) notFound();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quotes")
    .select(
      `
      number, title, total_cents, approved_at, share_token,
      company:companies(name, phone, logo_url, city, state),
      customer:customers(name, city, state),
      approvals:quote_approvals(signer_name, created_at, action)
    `,
    )
    .eq("share_token", token)
    .maybeSingle();

  if (error || !data) notFound();
  const quote = data as unknown as ApprovedData;

  const approval = quote.approvals
    .filter((a) => a.action === "approved")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];

  if (!quote.approved_at && !approval) {
    redirect(`/q/${token}`);
  }

  const approvedAt = approval?.created_at ?? quote.approved_at;
  const companyLocation = [quote.company.city, quote.company.state]
    .filter(Boolean)
    .join("/");
  const customerLocation = quote.customer
    ? [quote.customer.city, quote.customer.state].filter(Boolean).join("/")
    : "";
  const contactUrl = quote.company.phone
    ? whatsappShareLink({
        phone: quote.company.phone,
        message: `Olá, ${quote.company.name}. Acabei de aprovar o orçamento ${quote.number} (${quote.title}) e quero combinar os próximos passos.`,
      })
    : null;

  return (
    <main className="min-h-screen bg-[#fffaf3] text-[#25170f]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-4 sm:py-8">
        <header className="flex flex-col gap-3 border-b border-[#eadcc9] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {quote.company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={quote.company.logo_url}
                alt={quote.company.name}
                className="h-12 w-12 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#db5b18] text-lg font-bold text-white">
                {quote.company.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-semibold">{quote.company.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6f5a49]">
                {quote.company.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {formatPhone(quote.company.phone)}
                  </span>
                )}
                {companyLocation && <span>{companyLocation}</span>}
              </div>
            </div>
          </div>

          <Button asChild variant="outline" className="h-11 bg-white">
            <Link href={`/q/${token}`}>
              <ArrowLeft className="h-4 w-4" />
              Ver orçamento
            </Link>
          </Button>
        </header>

        <section className="grid flex-1 gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:py-10">
          <div className="min-w-0 space-y-5">
            <div className="rounded-lg border border-green-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-md bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
                    <ShieldCheck className="h-4 w-4" />
                    Aprovação registrada
                  </div>
                  <h1 className="mt-4 break-words text-3xl font-black leading-tight sm:text-4xl">
                    Orçamento aprovado com sucesso.
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f5a49] sm:text-base">
                    {approval ? (
                      <>
                        Obrigado,{" "}
                        <strong className="text-[#25170f]">
                          {approval.signer_name}
                        </strong>
                        . A aprovação foi registrada em{" "}
                        <strong className="text-[#25170f]">
                          {formatDateBR(approval.created_at)}
                        </strong>{" "}
                        e já aparece para {quote.company.name}.
                      </>
                    ) : (
                      <>
                        A aprovação foi registrada
                        {approvedAt ? ` em ${formatDateBR(approvedAt)}` : ""} e
                        já aparece para {quote.company.name}.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <section className="rounded-lg border border-[#eadcc9] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#db5b18]" />
                <div>
                  <h2 className="font-bold">Recibo da aprovação</h2>
                  <p className="mt-1 text-sm leading-6 text-[#6f5a49]">
                    Guarde esta página como confirmação. O orçamento completo
                    continua disponível pelo link original.
                  </p>
                </div>
              </div>

              <dl className="mt-5 divide-y divide-[#eadcc9]">
                <div className="grid gap-1 py-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <dt className="text-sm text-[#6f5a49]">Orçamento</dt>
                  <dd className="min-w-0 font-mono text-sm font-semibold">
                    {quote.number}
                  </dd>
                </div>
                <div className="grid gap-1 py-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <dt className="text-sm text-[#6f5a49]">Título</dt>
                  <dd className="min-w-0 break-words font-semibold">
                    {quote.title}
                  </dd>
                </div>
                {quote.customer && (
                  <div className="grid gap-1 py-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <dt className="text-sm text-[#6f5a49]">Cliente</dt>
                    <dd className="min-w-0">
                      <span className="font-semibold">
                        {quote.customer.name}
                      </span>
                      {customerLocation && (
                        <span className="text-[#6f5a49]">
                          {" "}
                          · {customerLocation}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                <div className="grid gap-1 py-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <dt className="text-sm text-[#6f5a49]">Data</dt>
                  <dd className="font-semibold">
                    {approvedAt ? formatDateBR(approvedAt) : "Registrada"}
                  </dd>
                </div>
                <div className="grid gap-1 py-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <dt className="text-sm text-[#6f5a49]">Total aprovado</dt>
                  <dd className="text-2xl font-black text-[#db5b18]">
                    {formatBRL(quote.total_cents / 100)}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <section className="rounded-lg border border-[#eadcc9] bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[#db5b18]" />
                <div>
                  <h2 className="font-bold">Próximos passos</h2>
                  <ol className="mt-3 space-y-3 text-sm leading-6 text-[#6f5a49]">
                    <li>
                      <span className="font-semibold text-[#25170f]">
                        1. Confirmação interna:
                      </span>{" "}
                      {quote.company.name} recebe a aprovação no painel.
                    </li>
                    <li>
                      <span className="font-semibold text-[#25170f]">
                        2. Alinhamento:
                      </span>{" "}
                      combine início, pagamento e detalhes finais da execução.
                    </li>
                    <li>
                      <span className="font-semibold text-[#25170f]">
                        3. Obra:
                      </span>{" "}
                      o orçamento aprovado pode virar acompanhamento da obra.
                    </li>
                  </ol>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#eadcc9] bg-white p-4 shadow-sm">
              <div className="grid gap-2">
                {contactUrl && (
                  <Button
                    asChild
                    className="h-12 bg-green-700 text-white hover:bg-green-800"
                  >
                    <TrackedAnchor
                      href={contactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      analyticsEvent="quote_contact_whatsapp_clicked"
                      analyticsProperties={{ source: "approved_page" }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Combinar pelo WhatsApp
                    </TrackedAnchor>
                  </Button>
                )}

                <Button asChild variant="outline" className="h-12 bg-white">
                  <TrackedAnchor
                    href={`/q/${quote.share_token}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    analyticsEvent="quote_pdf_clicked"
                    analyticsProperties={{ source: "approved_page" }}
                  >
                    <Download className="h-4 w-4" />
                    Baixar PDF aprovado
                  </TrackedAnchor>
                </Button>

                <Button asChild variant="outline" className="h-12 bg-white">
                  <Link href={`/q/${token}`}>
                    <FileText className="h-4 w-4" />
                    Abrir orçamento completo
                  </Link>
                </Button>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
