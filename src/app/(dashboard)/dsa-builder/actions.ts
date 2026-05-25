"use server";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getUser } from "@/lib/supabase/server";
import { buildContext } from "@/lib/dsa-builder/build-context";
import { buildFilename } from "@/lib/dsa-builder/filename";
import { renderToBuffer } from "@/lib/dsa-builder/render";
import { IntakeSchema, type Intake } from "@/lib/dsa-builder/schema";
import { signaturesForPreset } from "@/lib/dsa-builder/signatures";
import { notifySignedGeneration } from "@/lib/dsa-builder/notify-signed-generation";

export interface GeneratedDsa {
  filename: string;
  bytes: Uint8Array;
}

export async function generateDsa(rawIntake: unknown): Promise<GeneratedDsa> {
  const user = await getUser();
  if (!user) {
    throw new Error("Not signed in");
  }

  const intake: Intake = IntakeSchema.parse(rawIntake);

  const templatePath = resolve(
    process.cwd(),
    "public",
    "MCR_DSA_Master_Template.docx",
  );
  const template = await readFile(templatePath);

  const images = await signaturesForPreset(intake.mcr);
  const bytes = renderToBuffer(template, buildContext(intake), images);

  // Fire-and-forget tattle when a non-owner generates a signed copy.
  // Failures here must not block the doc download — log and move on.
  if (images.signatoryImage && images.witnessImage) {
    void notifySignedGeneration({
      userEmail: user.email,
      intake,
    }).catch((err) => {
      console.warn("notifySignedGeneration threw:", err);
    });
  }

  return {
    filename: buildFilename(intake.counterparty.shortName),
    bytes,
  };
}
