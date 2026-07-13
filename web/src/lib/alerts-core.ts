export type AlertSeverity = "critical" | "warning";

export type AlertContextValue = string | number | boolean | null;
export type AlertContext = Record<
  string,
  AlertContextValue | AlertContextValue[] | undefined
>;

export interface OperationalAlertEmailInput {
  appUrl: string;
  area: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  context?: AlertContext;
}

export function normalizeAlertRecipients(value?: string | null): string[] {
  if (!value) return [];

  const seen = new Set<string>();
  const recipients: string[] = [];

  for (const raw of value.split(/[;,]/)) {
    const email = extractEmailAddress(raw).toLowerCase();
    if (!email || !email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    recipients.push(email);
  }

  return recipients;
}

function extractEmailAddress(value: string) {
  const trimmed = value.trim();
  const bracketMatch = trimmed.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  if (bracketMatch?.[1]) return bracketMatch[1].trim();
  return trimmed;
}

export function buildAlertIdempotencyKey(input: {
  area: string;
  title: string;
  dedupeKey?: string;
}) {
  const source = input.dedupeKey ?? `${input.area}:${input.title}`;
  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);

  return `prumo-alert-${normalized || "operational"}`;
}

export function formatOperationalAlertEmail(input: OperationalAlertEmailInput) {
  const context = compactContext(input.context ?? {});
  const contextRows = Object.entries(context)
    .map(([key, value]) => {
      const rendered = Array.isArray(value) ? value.join(", ") : String(value);
      return `<tr><td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#475569;font-weight:700;">${escapeHtml(key)}</td><td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(rendered)}</td></tr>`;
    })
    .join("");

  const severityLabel =
    input.severity === "critical" ? "Critico" : "Atencao";
  const subject = `[Prumo][${severityLabel}] ${input.title}`;
  const text = [
    `${severityLabel}: ${input.title}`,
    `Area: ${input.area}`,
    `Mensagem: ${input.message}`,
    `Ambiente: ${input.appUrl}`,
    "",
    "Contexto:",
    ...Object.entries(context).map(([key, value]) => {
      const rendered = Array.isArray(value) ? value.join(", ") : String(value);
      return `- ${key}: ${rendered}`;
    }),
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#111827;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
        <div style="padding:18px 22px;background:${input.severity === "critical" ? "#991b1b" : "#92400e"};color:white;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Prumo ${severityLabel}</div>
          <h1 style="margin:8px 0 0;font-size:20px;line-height:1.3;">${escapeHtml(input.title)}</h1>
        </div>
        <div style="padding:22px;">
          <p style="margin:0 0 16px;line-height:1.6;color:#334155;">${escapeHtml(input.message)}</p>
          <p style="margin:0 0 16px;font-size:13px;color:#64748b;">Area: <strong>${escapeHtml(input.area)}</strong><br/>Ambiente: ${escapeHtml(input.appUrl)}</p>
          ${
            contextRows
              ? `<table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb;">${contextRows}</table>`
              : ""
          }
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
}

function compactContext(context: AlertContext) {
  const compacted: Record<string, AlertContextValue | AlertContextValue[]> = {};

  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined) compacted[key] = value;
  }

  return compacted;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
