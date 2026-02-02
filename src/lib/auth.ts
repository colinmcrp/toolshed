const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "mcrpathways.org";

export function isAllowedEmail(email: string): boolean {
  // Bypass domain check in development
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

export function getEmailDomain(): string {
  return ALLOWED_DOMAIN;
}
