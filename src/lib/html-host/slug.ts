/**
 * Slug validation and suggestion utilities for the HTML Host tool.
 *
 * Rules:
 *  - Must start and end with a lowercase letter or digit
 *  - May contain lowercase letters, digits, and hyphens in the middle
 *  - Minimum length: 3 characters
 *  - Maximum length: 64 characters
 */

/** Regex that a valid slug must fully match. */
export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

/** Alphabetized list of slugs that are reserved and may not be used. */
const RESERVED_SLUGS_LIST: readonly string[] = [
  '_next',
  'admin',
  'api',
  'assets',
  'auth',
  'favicon',
  'favicon.ico',
  'html-host',
  'login',
  'profile',
  'public',
  'secure-zip',
  'signup',
  'static',
];

/** Set of slugs that are reserved and may not be used. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set(RESERVED_SLUGS_LIST);

// ─── Types ────────────────────────────────────────────────────────────────────

export type ValidateSlugResult =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'too-short' | 'too-long' | 'bad-format' | 'reserved' };

// ─── validateSlug ─────────────────────────────────────────────────────────────

/**
 * Validates a candidate slug string.
 *
 * Checks are applied cheapest-first:
 *   empty → too-short → too-long → bad-format → reserved
 */
export function validateSlug(slug: string): ValidateSlugResult {
  if (slug.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (slug.length < 3) {
    return { ok: false, reason: 'too-short' };
  }
  if (slug.length > 64) {
    return { ok: false, reason: 'too-long' };
  }
  if (!SLUG_REGEX.test(slug)) {
    return { ok: false, reason: 'bad-format' };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, reason: 'reserved' };
  }
  return { ok: true };
}

// ─── suggestSlug ──────────────────────────────────────────────────────────────

/**
 * Sanitizes a raw string into a slug-safe base.
 *
 * Steps:
 *  1. Lowercase
 *  2. Replace runs of non-alphanumeric characters with a single dash
 *  3. Trim leading/trailing dashes
 *  4. Truncate to 61 characters (leaving headroom for a `-NN` suffix)
 */
function sanitizeBase(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 61);
}

/**
 * Suggests an available slug derived from `base`.
 *
 * 1. If `base` is a valid slug and not taken, returns it unchanged.
 * 2. Otherwise sanitizes `base` (and falls back to `'artifact'` if too short).
 * 3. Tries `${sanitized}-2` … `${sanitized}-99` in order.
 * 4. Returns the last candidate tried if all 99 are taken (degenerate case).
 */
export function suggestSlug(base: string, isTaken: (slug: string) => boolean): string {
  // If base is already a valid, available slug return it immediately.
  if (validateSlug(base).ok && !isTaken(base)) {
    return base;
  }

  // Sanitize the base for use as a prefix.
  let sanitized = sanitizeBase(base);

  // Fall back to 'artifact' when sanitization yields something too short.
  if (sanitized.length < 3) {
    sanitized = 'artifact';
  }

  // Try numbered suffixes from 2 to 99.
  let last = `${sanitized}-2`;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${sanitized}-${i}`;
    last = candidate;
    if (!isTaken(candidate)) {
      return candidate;
    }
  }

  // All 99 suggestions were taken — return the last one without throwing.
  return last;
}
