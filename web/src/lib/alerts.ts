import "server-only";

import { env } from "@/lib/env";
import { DEFAULT_FROM, TRANSACTIONAL_EMAIL_ENABLED, getResendClient } from "@/lib/email/client";
import { serverEnv } from "@/lib/env-server";
import { logServerError, logServerEvent, logServerWarning } from "@/lib/log";
import {
  buildAlertIdempotencyKey,
  formatOperationalAlertEmail,
  normalizeAlertRecipients,
  type AlertContext,
  type AlertSeverity,
} from "@/lib/alerts-core";

interface OperationalAlertInput {
  area: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  context?: AlertContext;
  dedupeKey?: string;
}

export async function sendOperationalAlert(input: OperationalAlertInput) {
  const recipients = normalizeAlertRecipients(
    serverEnv.ALERT_EMAIL_TO ?? serverEnv.EMAIL_FROM,
  );
  const dedupeKey = buildAlertIdempotencyKey({
    area: input.area,
    title: input.title,
    dedupeKey: input.dedupeKey,
  });

  if (recipients.length === 0) {
    logServerWarning("ops.alert.not_configured", {
      area: input.area,
      severity: input.severity,
      title: input.title,
      dedupe_key: dedupeKey,
    });
    return { sent: false, error: "ALERT_EMAIL_TO not configured" };
  }

  if (!TRANSACTIONAL_EMAIL_ENABLED) {
    logServerWarning("ops.alert.email_disabled", {
      area: input.area,
      severity: input.severity,
      title: input.title,
      dedupe_key: dedupeKey,
    });
    return { sent: false, error: "Transactional email disabled" };
  }

  const resend = getResendClient();
  if (!resend) {
    logServerWarning("ops.alert.resend_missing", {
      area: input.area,
      severity: input.severity,
      title: input.title,
      dedupe_key: dedupeKey,
    });
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const email = formatOperationalAlertEmail({
    appUrl: env.NEXT_PUBLIC_APP_URL,
    area: input.area,
    severity: input.severity,
    title: input.title,
    message: input.message,
    context: input.context,
  });

  try {
    const { error } = await resend.emails.send(
      {
        from: DEFAULT_FROM,
        to: recipients,
        subject: email.subject,
        html: email.html,
        text: email.text,
      },
      { idempotencyKey: dedupeKey },
    );

    if (error) {
      logServerError("ops.alert.send_failed", error, {
        area: input.area,
        severity: input.severity,
        title: input.title,
        dedupe_key: dedupeKey,
      });
      return { sent: false, error: error.message };
    }

    logServerEvent("ops.alert.sent", {
      area: input.area,
      severity: input.severity,
      title: input.title,
      recipients: recipients.length,
      dedupe_key: dedupeKey,
    });
    return { sent: true };
  } catch (error) {
    logServerError("ops.alert.send_exception", error, {
      area: input.area,
      severity: input.severity,
      title: input.title,
      dedupe_key: dedupeKey,
    });
    return { sent: false, error: "Alert send failed" };
  }
}
