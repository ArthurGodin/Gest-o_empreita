import { findHelpTopic } from "./help-center";

export const SUPPORT_SOURCES = [
  "help_center",
  "help_empty_search",
  "login",
  "forgot_password",
  "landing",
  "pricing",
  "settings",
  "app_error",
  "not_found",
  "quote_not_found",
  "terms",
  "privacy",
] as const;

export type SupportSource = (typeof SUPPORT_SOURCES)[number];

export interface SupportContactContext {
  source: SupportSource;
  topicId?: string;
}

export function isSupportSource(value: unknown): value is SupportSource {
  return SUPPORT_SOURCES.includes(value as SupportSource);
}

export function buildSupportMailto(
  context: SupportContactContext,
  supportEmail: string,
) {
  if (!isSupportSource(context.source)) {
    throw new Error("Unknown support source");
  }
  if (!isValidSupportEmail(supportEmail)) {
    throw new Error("Invalid support email");
  }

  const topic = context.topicId ? findHelpTopic(context.topicId) : null;
  if (context.topicId && !topic) {
    throw new Error("Unknown help topic");
  }

  const subject = topic
    ? `Ajuda no Prumo: ${topic.question}`
    : "Ajuda com o Prumo";
  const body = [
    "Olá, preciso de ajuda com o Prumo.",
    topic ? `Assunto: ${topic.question}` : null,
    "",
    "O que eu estava tentando fazer:",
    "",
    "O que aconteceu:",
    "",
    "Não inclua senha, cartão, documento completo ou link privado nesta mensagem.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
  const params = new URLSearchParams({ subject, body });

  return `mailto:${supportEmail.trim()}?${params.toString()}`;
}

function isValidSupportEmail(value: string): boolean {
  const normalized = value.trim();
  const atIndex = normalized.indexOf("@");

  return (
    atIndex > 0 &&
    atIndex === normalized.lastIndexOf("@") &&
    atIndex < normalized.length - 3 &&
    normalized.includes(".", atIndex + 2) &&
    !/\s/.test(normalized)
  );
}
