import { describe, expect, it, vi, beforeEach } from "vitest";

// getUser is the only collaborator the unauthenticated branch touches — the
// auth check runs before schema parsing, the template read, and rendering.
const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  getUser: getUserMock,
  createClient: vi.fn(),
}));

// next/server's `after` is only used on the signed-copy path; stub it so the
// action module imports cleanly under vitest's jsdom environment.
vi.mock("next/server", () => ({ after: (fn: () => void) => fn() }));

import { generateDsa } from "./actions";

beforeEach(() => {
  getUserMock.mockReset();
});

describe("generateDsa — unauthenticated handling", () => {
  // Regression: a non-owner (natalie.smith@) hit a 500 "Server Components
  // render" digest because the action *threw* Error("Not signed in") when the
  // session had lapsed. Next.js redacts thrown action-error messages in
  // production, so the failure reached the browser as an undiagnosable 500 and
  // discarded the form. Sibling html-host actions instead RETURN a structured
  // error, which survives to the client. The action must do the same.
  it("returns a structured unauthenticated result instead of throwing when there is no user", async () => {
    getUserMock.mockResolvedValue(null);

    // Intake is irrelevant here: the auth check short-circuits before any
    // schema parsing, so an empty object never reaches IntakeSchema.parse.
    await expect(generateDsa({} as unknown)).resolves.toEqual({
      ok: false,
      code: "unauthenticated",
      error: expect.stringMatching(/sign in/i),
    });
  });
});
