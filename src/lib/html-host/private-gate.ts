import { isAllowedEmail } from "@/lib/auth";

export type PrivateGateResult =
  | { action: "serve" }
  | { action: "redirect"; location: string }
  | { action: "forbidden" };

/**
 * Access decision for a private artifact. Anonymous viewers are sent to login
 * (and bounced back via `next`); signed-in viewers must have an allowed email.
 */
/**
 * Privacy for a (re)publish. An explicit request always wins; otherwise an
 * overwrite keeps the replaced artifact's setting (re-publishing must never
 * silently make a private page public), and a fresh publish defaults public.
 */
export function resolveArtifactPrivacy(
  requested: boolean | undefined,
  replacedArtifact: { is_private: boolean } | null
): boolean {
  if (requested !== undefined) return requested;
  return replacedArtifact?.is_private ?? false;
}

export function gatePrivateArtifact(
  user: { email?: string | null } | null,
  requestPath: string
): PrivateGateResult {
  if (!user) {
    return {
      action: "redirect",
      location: `/login?next=${encodeURIComponent(requestPath)}`,
    };
  }
  if (!isAllowedEmail(user.email ?? "")) {
    return { action: "forbidden" };
  }
  return { action: "serve" };
}
