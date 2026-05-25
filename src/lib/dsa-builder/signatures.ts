import { createServiceClient } from "@/lib/supabase/service";
import { MCR_SIGNER_PRESET } from "./defaults";
import type { Mcr } from "./schema";
import type { RenderImages } from "./render";

const BUCKET = "dsa-signatures";
const SIGNATORY_PATH = "mcr/sharon-mcintyre.png";
const WITNESS_PATH = "mcr/colin-adam.png";

export interface SignaturesDeps {
  download: (path: string) => Promise<Uint8Array>;
}

async function defaultDownload(path: string): Promise<Uint8Array> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    throw new Error(
      `Failed to load signature ${path}: ${error?.message ?? "no data"}`,
    );
  }
  return new Uint8Array(await data.arrayBuffer());
}

export async function signaturesForPreset(
  mcr: Mcr,
  deps: SignaturesDeps = { download: defaultDownload },
): Promise<RenderImages> {
  if (
    mcr.signatoryName !== MCR_SIGNER_PRESET.signatoryName ||
    mcr.witnessName !== MCR_SIGNER_PRESET.witnessName
  ) {
    return {};
  }
  const [signatoryImage, witnessImage] = await Promise.all([
    deps.download(SIGNATORY_PATH),
    deps.download(WITNESS_PATH),
  ]);
  return { signatoryImage, witnessImage };
}
