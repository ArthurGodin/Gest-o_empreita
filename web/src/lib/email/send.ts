import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_FROM, getResendClient } from "@/lib/email/client";
import { logServerError } from "@/lib/log";

/**
 * Notifica o owner de uma empresa por email. Best-effort — se Resend não
 * está configurado, loga e segue. Erros do Resend também não propagam.
 *
 * Retorna { sent } pra o caller poder marcar idempotência se quiser.
 */
export async function notifyCompanyOwner(
  companyId: string,
  email: { subject: string; html: string; text: string },
): Promise<{ sent: boolean; error?: string }> {
  // Busca o email do owner via admin client (RLS bypassed)
  const admin = createAdminClient();

  const { data: members, error: memberError } = await admin
    .from("company_members")
    .select("user_id, role")
    .eq("company_id", companyId)
    .eq("role", "owner")
    .limit(5);

  if (memberError || !members || members.length === 0) {
    logServerError("email.find-owner", memberError);
    return { sent: false, error: "Owner não encontrado." };
  }

  const userIds = (members as Array<{ user_id: string }>).map((m) => m.user_id);

  // auth.users não é acessível via PostgREST normal; admin client tem getUserById
  const ownerEmails: string[] = [];
  for (const uid of userIds) {
    try {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      if (u?.user?.email) ownerEmails.push(u.user.email);
    } catch (e) {
      logServerError("email.get-user", e);
    }
  }

  if (ownerEmails.length === 0) {
    return { sent: false, error: "Nenhum email de owner encontrado." };
  }

  const resend = getResendClient();
  if (!resend) {
    // Modo dev sem chave: loga e finge sucesso pra não bloquear o fluxo
    console.log(
      `[email] (dev mode, sem Resend) Mandaria pra ${ownerEmails.join(", ")}:`,
      email.subject,
    );
    return { sent: false, error: "RESEND_API_KEY não configurada." };
  }

  try {
    const { error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: ownerEmails,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (error) {
      logServerError("email.send", error);
      return { sent: false, error: error.message };
    }

    return { sent: true };
  } catch (e) {
    logServerError("email.send.exception", e);
    return { sent: false, error: "Falha ao enviar email." };
  }
}
