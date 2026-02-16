const STAFF_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "mcrpathways.org";

export function isStaffEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${STAFF_DOMAIN}`);
}

export function isAllowedEmail(email: string): boolean {
  // In development, allow all emails
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  // Client-side: be permissive — server validates against partner_domains
  return true;
}

export function getEmailDomain(): string {
  return STAFF_DOMAIN;
}

export function getEmailDomainPart(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}
