/** Normaliza lista de e-mails autorizados para login Google. */
export function splitAllowedEmails(value) {
  return [
    ...new Set(
      String(value || "")
        .split(/[\s,;]+/)
        .map((email) => email.toLowerCase().trim())
        .filter(Boolean),
    ),
  ];
}

export function isValidAllowedEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}
