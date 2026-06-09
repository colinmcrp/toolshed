"use server";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { after } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { buildContext, pickTemplate } from "@/lib/dsa-builder/build-context";
import { buildFilename } from "@/lib/dsa-builder/filename";
import { renderToBuffer } from "@/lib/dsa-builder/render";
import { IntakeSchema, type Intake } from "@/lib/dsa-builder/schema";
import { signaturesForPreset } from "@/lib/dsa-builder/signatures";
import { notifySignedGeneration } from "@/lib/dsa-builder/notify-signed-generation";

export interface GeneratedDsa {
  filename: string;
  bytes: Uint8Array;
}

// Discriminated result rather than a bare GeneratedDsa: a thrown error in a
// Server Action has its message redacted by Next.js in production (the opaque
// "Server Components render" digest), so an expired session surfaced to the
// user as an undiagnosable 500 that also discarded the form. Returning the
// failure — as the sibling html-host actions already do — lets it survive to
// the client, which can show a re-login prompt and keep the wizard intact.
export type GenerateDsaResult =
  | { ok: true; filename: string; bytes: Uint8Array }
  | { ok: false; error: string; code: "unauthenticated" };

export async function generateDsa(
  rawIntake: unknown,
): Promise<GenerateDsaResult> {
  const user = await getUser();
  if (!user) {
    return {
      ok: false,
      code: "unauthenticated",
      error: "Your session has expired. Please sign in again and retry.",
    };
  }

  const intake: Intake = IntakeSchema.parse(rawIntake);

  const templatePath = resolve(
    process.cwd(),
    "public",
    pickTemplate(intake.counterpartyType),
  );
  const template = await readFile(templatePath);

  const images = await signaturesForPreset(intake.mcr);
  const bytes = renderToBuffer(template, buildContext(intake), images);

  // Tattle email when a non-owner generates a signed copy. Run via
  // next/server's `after` so the email POST completes after the response
  // is sent but the function stays alive — a plain `void` floating
  // promise on Vercel can be killed when the container freezes
  // post-response (per gemini-code-assist on PR #20).
  if (images.signatoryImage && images.witnessImage) {
    after(() =>
      notifySignedGeneration({
        userEmail: user.email,
        intake,
      }).catch((err) => {
        console.warn("notifySignedGeneration threw:", err);
      }),
    );
  }

  return {
    ok: true,
    filename: buildFilename(intake.counterparty.shortName),
    bytes,
  };
}
