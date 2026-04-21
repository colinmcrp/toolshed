import { describe, it, expect } from 'vitest';
import { validateSlug, suggestSlug, RESERVED_SLUGS, SLUG_REGEX } from './slug';

// ─── SLUG_REGEX ───────────────────────────────────────────────────────────────

describe('SLUG_REGEX', () => {
  it('matches a minimal valid slug (3 chars)', () => {
    expect(SLUG_REGEX.test('abc')).toBe(true);
  });

  it('matches a slug with hyphens in the middle', () => {
    expect(SLUG_REGEX.test('a-b')).toBe(true);
  });

  it('matches a slug with consecutive hyphens in the middle', () => {
    expect(SLUG_REGEX.test('ab--cd')).toBe(true);
  });

  it('does not match uppercase letters', () => {
    expect(SLUG_REGEX.test('AB')).toBe(false);
    expect(SLUG_REGEX.test('Abc')).toBe(false);
  });

  it('does not match a leading dash', () => {
    expect(SLUG_REGEX.test('-abc')).toBe(false);
  });

  it('does not match a trailing dash', () => {
    expect(SLUG_REGEX.test('abc-')).toBe(false);
  });

  it('does not match strings with spaces', () => {
    expect(SLUG_REGEX.test('ab c')).toBe(false);
  });

  it('does not match strings with dots', () => {
    expect(SLUG_REGEX.test('ab.c')).toBe(false);
  });

  it('does not match a 2-char string', () => {
    // Regex requires at least a[a-z0-9-]{1,62}a = 3 chars minimum
    expect(SLUG_REGEX.test('ab')).toBe(false);
  });
});

// ─── RESERVED_SLUGS ──────────────────────────────────────────────────────────

describe('RESERVED_SLUGS', () => {
  it('contains expected app route segments', () => {
    expect(RESERVED_SLUGS.has('api')).toBe(true);
    expect(RESERVED_SLUGS.has('auth')).toBe(true);
    expect(RESERVED_SLUGS.has('login')).toBe(true);
    expect(RESERVED_SLUGS.has('signup')).toBe(true);
    expect(RESERVED_SLUGS.has('profile')).toBe(true);
    expect(RESERVED_SLUGS.has('secure-zip')).toBe(true);
    expect(RESERVED_SLUGS.has('html-host')).toBe(true);
  });

  it('contains Next.js / static asset segments', () => {
    expect(RESERVED_SLUGS.has('_next')).toBe(true);
    expect(RESERVED_SLUGS.has('favicon')).toBe(true);
    expect(RESERVED_SLUGS.has('favicon.ico')).toBe(true);
  });

  it('contains defensive common reserved names', () => {
    expect(RESERVED_SLUGS.has('admin')).toBe(true);
    expect(RESERVED_SLUGS.has('static')).toBe(true);
    expect(RESERVED_SLUGS.has('public')).toBe(true);
    expect(RESERVED_SLUGS.has('assets')).toBe(true);
  });

  it('does not contain an arbitrary word', () => {
    expect(RESERVED_SLUGS.has('my-cool-project')).toBe(false);
  });
});

// ─── validateSlug ─────────────────────────────────────────────────────────────

describe('validateSlug', () => {
  // ── empty ──
  it('returns empty for an empty string', () => {
    expect(validateSlug('')).toEqual({ ok: false, reason: 'empty' });
  });

  // ── too-short ──
  it('returns too-short for a single character', () => {
    expect(validateSlug('a')).toEqual({ ok: false, reason: 'too-short' });
  });

  it('returns too-short for a two-character string', () => {
    expect(validateSlug('ab')).toEqual({ ok: false, reason: 'too-short' });
  });

  // ── too-long ──
  it('returns too-long for a 65-character string', () => {
    const slug = 'a'.repeat(65);
    expect(validateSlug(slug)).toEqual({ ok: false, reason: 'too-long' });
  });

  it('returns ok for a 64-character valid slug', () => {
    // Must start & end with alphanumeric; fill middle with 62 chars
    const slug = 'a' + 'b'.repeat(62) + 'c'; // 64 chars
    expect(validateSlug(slug)).toEqual({ ok: true });
  });

  // ── bad-format ──
  it('returns bad-format for uppercase letters (3-char string)', () => {
    // 'AB' is only 2 chars and hits too-short first; use 3-char 'ABC' to reach bad-format
    expect(validateSlug('ABC')).toEqual({ ok: false, reason: 'bad-format' });
  });

  it('returns bad-format for a string with uppercase (length >= 3)', () => {
    expect(validateSlug('Abc')).toEqual({ ok: false, reason: 'bad-format' });
  });

  it('returns bad-format for a leading dash', () => {
    expect(validateSlug('-abc')).toEqual({ ok: false, reason: 'bad-format' });
  });

  it('returns bad-format for a trailing dash', () => {
    expect(validateSlug('abc-')).toEqual({ ok: false, reason: 'bad-format' });
  });

  it('returns bad-format for a space in the slug', () => {
    expect(validateSlug('ab c')).toEqual({ ok: false, reason: 'bad-format' });
  });

  it('returns bad-format for a dot in the slug', () => {
    expect(validateSlug('ab.c')).toEqual({ ok: false, reason: 'bad-format' });
  });

  // favicon.ico has a dot, so it should be caught as bad-format before reserved
  it('returns bad-format for favicon.ico (dot prevents regex match before reserved check)', () => {
    const result = validateSlug('favicon.ico');
    expect(result).toEqual({ ok: false, reason: 'bad-format' });
  });

  // ── reserved ──
  it('returns reserved for "api"', () => {
    expect(validateSlug('api')).toEqual({ ok: false, reason: 'reserved' });
  });

  it('returns reserved for "login"', () => {
    expect(validateSlug('login')).toEqual({ ok: false, reason: 'reserved' });
  });

  it('returns reserved for "html-host"', () => {
    expect(validateSlug('html-host')).toEqual({ ok: false, reason: 'reserved' });
  });

  it('returns reserved for "admin"', () => {
    expect(validateSlug('admin')).toEqual({ ok: false, reason: 'reserved' });
  });

  // ── ok ──
  it('returns ok for "abc"', () => {
    expect(validateSlug('abc')).toEqual({ ok: true });
  });

  it('returns ok for "a-b"', () => {
    expect(validateSlug('a-b')).toEqual({ ok: true });
  });

  it('returns ok for a slug with consecutive dashes in the middle', () => {
    expect(validateSlug('ab--cd')).toEqual({ ok: true });
  });

  it('returns ok for a slug with digits', () => {
    expect(validateSlug('my-tool-v2')).toEqual({ ok: true });
  });

  it('returns ok for a slug that starts and ends with digits', () => {
    expect(validateSlug('123abc456')).toEqual({ ok: true });
  });
});

// ─── suggestSlug ──────────────────────────────────────────────────────────────

describe('suggestSlug', () => {
  it('returns the base slug when it is valid and not taken', () => {
    expect(suggestSlug('my-project', () => false)).toBe('my-project');
  });

  it('returns base-2 when the base itself is taken', () => {
    const taken = new Set(['my-project']);
    expect(suggestSlug('my-project', (s) => taken.has(s))).toBe('my-project-2');
  });

  it('returns base-6 when base and base-2 through base-5 are all taken', () => {
    const taken = new Set(['my-project', 'my-project-2', 'my-project-3', 'my-project-4', 'my-project-5']);
    expect(suggestSlug('my-project', (s) => taken.has(s))).toBe('my-project-6');
  });

  it('sanitizes an empty base to "artifact" and returns artifact-2 when taken', () => {
    expect(suggestSlug('', () => false)).toBe('artifact-2');
  });

  it('sanitizes "Hello World!" to "hello-world"', () => {
    expect(suggestSlug('Hello World!', () => false)).toBe('hello-world-2');
  });

  it('sanitizes "  foo  bar  " to "foo-bar"', () => {
    expect(suggestSlug('  foo  bar  ', () => false)).toBe('foo-bar-2');
  });

  it('truncates a base longer than 61 characters before appending suffix', () => {
    const longBase = 'a'.repeat(70);
    const result = suggestSlug(longBase, () => false);
    // Sanitized base is 61 'a's; result should be that + '-2'
    expect(result).toBe('a'.repeat(61) + '-2');
    expect(result.length).toBeLessThanOrEqual(64);
  });

  it('returns the last candidate (base-99) when all 99 suggestions are taken', () => {
    const taken = new Set<string>();
    for (let i = 2; i <= 99; i++) {
      taken.add(`my-project-${i}`);
    }
    // base itself is invalid (we'll pass a reserved slug to force sanitization path)
    // Actually let's use a valid slug that's also in the taken set
    taken.add('my-project');
    const result = suggestSlug('my-project', (s) => taken.has(s));
    expect(result).toBe('my-project-99');
  });

  it('does not throw when all 99 suggestions are taken', () => {
    const taken = new Set<string>();
    for (let i = 2; i <= 99; i++) {
      taken.add(`widget-${i}`);
    }
    taken.add('widget');
    expect(() => suggestSlug('widget', (s) => taken.has(s))).not.toThrow();
  });

  it('returns base-2 for a reserved base like "api"', () => {
    // 'api' is reserved (validateSlug returns reserved), so suggestSlug will sanitize & try suffixes
    expect(suggestSlug('api', () => false)).toBe('api-2');
  });

  it('handles a base with leading/trailing special characters', () => {
    const result = suggestSlug('---hello---', () => false);
    expect(result).toBe('hello-2');
  });

  it('handles a base that is all special characters (falls back to artifact)', () => {
    const result = suggestSlug('!!!', () => false);
    expect(result).toBe('artifact-2');
  });

  it('sanitizes mixed-case base correctly', () => {
    const result = suggestSlug('MyApp', () => false);
    expect(result).toBe('myapp-2');
  });
});
