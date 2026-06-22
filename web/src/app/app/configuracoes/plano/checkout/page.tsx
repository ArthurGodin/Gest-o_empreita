import { redirect } from "next/navigation";
import { getCurrentUser, getActiveCompany } from "@/lib/queries/company";
import { createAdminClient } from "@/lib/supabase/admin";
import { PaymentForm } from "./payment-form";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const company = await getActiveCompany();
  if (!company) redirect("/app");

  // Se já for pro, manda de volta
  if (company.plan === "pro") {
    redirect("/app/configuracoes/plano");
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-center">
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Assinatura PRO
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Libere todos os recursos ilimitados para a sua empresa.
          </p>
        </div>

        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-900/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Plano Profissional</span>
            <span className="text-sm font-bold text-amber-900 dark:text-amber-100">R$ 97,00/mês</span>
          </div>
          <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 mt-3">
            <li>✓ Orçamentos Ilimitados</li>
            <li>✓ Obras Ilimitadas</li>
            <li>✓ Integração Pix Asaas</li>
            <li>✓ Sem marca d&apos;água</li>
          </ul>
        </div>

        <PaymentForm />
        
        <div className="text-center mt-4">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Ambiente seguro simulado. Nenhum valor real será cobrado.
          </p>
        </div>
      </div>
    </div>
  );
}
