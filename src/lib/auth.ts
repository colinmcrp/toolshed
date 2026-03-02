const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "mcrpathways.org";

export function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

export function getEmailDomain(): string {
  return ALLOWED_DOMAIN;
}
