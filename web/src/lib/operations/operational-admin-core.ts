const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseOperationalAdminEmails(value: string | undefined) {
  if (!value) return [];

  return [
    ...new Set(
      value
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter((email) => SIMPLE_EMAIL.test(email)),
    ),
  ].sort();
}

export function isOperationalAdminEmail(
  email: string | null | undefined,
  configuredEmails: string | undefined,
) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return false;
  return parseOperationalAdminEmails(configuredEmails).includes(normalizedEmail);
}
