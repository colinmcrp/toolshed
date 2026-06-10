const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "mcrpathways.org";

export function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

export function getEmailDomain(): string {
  return ALLOWED_DOMAIN;
}

/**
 * Only same-origin relative paths may be used as a post-login `next` target.
 * Rejects absolute URLs, protocol-relative ("//host") and backslash variants,
 * which would otherwise be open redirects.
 */
export function isSafeNextPath(next: string | null | undefined): next is string {
  if (!next || !next.startsWith("/")) return false;
  const second = next[1];
  return second !== "/" && second !== "\\";
}
