# Private HTML Published Pages — Design

**Date:** 2026-06-10
**Status:** Approved (Colin, 2026-06-10)

## Goal

Add a per-page "private" option to the HTML host. A private published page
requires the viewer to sign in (Google or magic link, via the existing
Supabase auth flow) with an `@mcrpathways.org` email before the page is
served. Additionally, harden the app's sign-in paths so that **no** account
with a non-`@mcrpathways.org` email can hold a usable session (an audit found
this is currently bypassable).

## Part 1 — Close existing sign-in holes

Audit findings (2026-06-10):

1. `/auth/callback` checks `isAllowedEmail()` but `exchangeCodeForSession()`
   has already set session cookies; rejected users keep a working session and
   the middleware (which only checks user presence) admits them.
2. The magic-link path has no server-side domain check: `signInWithOtp()` can
   be called directly with the public anon key (client-side form validation is
   the only gate), and `/auth/confirm` verifies the OTP without checking the
   email domain.
3. `updateSession` middleware never checks the email domain.

Fixes (all app-level, defense in depth):

- **Middleware** (`src/lib/supabase/middleware.ts`): after `getUser()`, if a
  user exists and `!isAllowedEmail(user.email)`, call
  `supabase.auth.signOut()` and redirect to `/login?error=unauthorized_domain`.
  This is the backstop that neutralises every hole. (Skipped in development
  like the rest of `updateSession`; artifact URLs and `/api/*` are not covered
  by this — private artifact serving does its own check, Part 2.)
- **`/auth/callback`**: call `supabase.auth.signOut()` before redirecting a
  disallowed user.
- **`/auth/confirm`**: after `verifyOtp()`, fetch the user; if
  `!isAllowedEmail(email)`, sign out and redirect to
  `/login?error=unauthorized_domain`.
- **Recommendation (out of repo scope):** add a Supabase "before user created"
  auth hook or disable open signups in the Supabase dashboard, so disallowed
  accounts are never created at all. The app-level checks above make such
  sessions unusable regardless.

## Part 2 — Private pages

### Data model

Migration `html_artifacts_add_is_private`:

- `alter table public.html_artifacts add column is_private boolean not null default false;`
- Owner-only `update` RLS policy, with column-level privileges so only
  `is_private` is updatable by `authenticated` (revoke table `update`, grant
  `update (is_private)`), preserving the "artifacts are immutable" rule for
  everything else.

### Serving (`src/app/[...path]/route.ts`)

- Include `is_private` in the artifact lookup (service client, unchanged).
- If `is_private`:
  - Read the viewer's session with the cookie-based server client
    (`@/lib/supabase/server`).
  - No session → `302` redirect to `/login?next=<original-path>`.
  - Session but `!isAllowedEmail(email)` → `403` with a minimal
    "Restricted to MCR Pathways staff" HTML body (defense in depth; Part 1
    should make this rare).
  - Allowed → serve as today but with `Cache-Control: private, no-store`.
- Public pages keep `public, max-age=300`. Caveat: flipping a page
  public→private can leave the old copy in edge cache for up to ~5 minutes.

### Login `next` redirect

- `/login` reads a `next` query param (via `useSearchParams`) and threads it
  through both flows:
  - Google: `redirectTo: ${origin}/auth/callback?next=<next>`
  - Magic link: `emailRedirectTo: ${origin}/auth/callback?next=<next>`
- `next` is only honoured if it is a same-origin relative path
  (`startsWith("/")` and not `startsWith("//")`) — prevents open redirects.
  Validate in both the login page and `/auth/callback`.
- `/auth/callback` already honours `next`; artifact URLs bypass the
  middleware's auth redirect, so the signed-in user lands directly on the
  private page.
- Optional UX: when `next` is present, show "Sign in to view this page" copy
  on the login card.

### Publish API (`src/app/api/publish/route.ts`)

- Body schema gains `private: z.boolean().optional()`.
- Insert `is_private` accordingly.
- On `overwrite: true` with `private` **unspecified**, preserve the existing
  artifact's `is_private` (re-publishing must not silently make a private page
  public). An explicit `private: false` does make it public.
- Response includes `private: boolean`.

### Dashboard (html-host)

- **Upload dialog**: "Private — require @mcrpathways.org sign-in" checkbox;
  `prepareArtifactUpload` accepts and inserts `isPrivate`.
- **Artifact row**: lock badge when private; a private/public switch backed by
  a new server action `setArtifactPrivacy(id, isPrivate)` (user-scoped client;
  RLS update policy from the migration enforces ownership).
- `listMyArtifacts` / `HtmlArtifact` type gain `is_private`.

### mcr-publish skill

- Update the user-level `mcr-publish` skill docs to describe the `private`
  flag (publish request example + overwrite-preservation rule).

## Testing

- Publish API tests (extend existing test pattern): `private: true` inserted;
  overwrite preserves privacy when unspecified; explicit `private: false`
  clears it.
- Serving route tests: private + no session → redirect with correct `next`;
  private + disallowed email → 403; private + allowed → 200 with `no-store`;
  public unchanged.
- Auth hardening tests where practical (e.g. `isAllowedEmail` edge cases,
  `next` path validation helper).

## Error handling

- Privacy lookup failures fall through to the existing 404 behaviour.
- `setArtifactPrivacy` returns the action-style `{ ok, error }` result used by
  the other html-host actions.
- Sign-out failures during rejection still redirect to `/login` with the error
  (the middleware backstop re-checks on every request).

## Out of scope

- Per-user or per-group sharing (the only audience is "any MCR staff").
- Restricting *which* signed-in MCR users can see a given page.
- Supabase dashboard configuration changes (recommended separately).
