import { describe, expect, it, vi } from "vitest";
import { signaturesForPreset } from "./signatures";
import { MCR_SIGNER_PRESET } from "./defaults";

const PRESET_MCR = {
  signatoryName: MCR_SIGNER_PRESET.signatoryName,
  signatoryPosition: MCR_SIGNER_PRESET.signatoryPosition,
  signatoryDate: "2026-05-25",
  witnessName: MCR_SIGNER_PRESET.witnessName,
  witnessPosition: MCR_SIGNER_PRESET.witnessPosition,
  witnessDate: "2026-05-25",
};

const SIG_BYTES = new Uint8Array([1, 2, 3]);
const WIT_BYTES = new Uint8Array([4, 5, 6]);

function makeDownloader() {
  return vi.fn(async (path: string) => {
    if (path === "mcr/sharon-mcintyre.png") return SIG_BYTES;
    if (path === "mcr/colin-adam.png") return WIT_BYTES;
    throw new Error(`Unexpected download path: ${path}`);
  });
}

describe("signaturesForPreset", () => {
  it("returns both buffers when names match the preset exactly", async () => {
    const download = makeDownloader();
    const result = await signaturesForPreset(PRESET_MCR, { download });
    expect(result).toEqual({
      signatoryImage: SIG_BYTES,
      witnessImage: WIT_BYTES,
    });
    expect(download).toHaveBeenCalledTimes(2);
  });

  it("returns {} when signatoryName is edited", async () => {
    const download = makeDownloader();
    const result = await signaturesForPreset(
      { ...PRESET_MCR, signatoryName: "Someone Else" },
      { download },
    );
    expect(result).toEqual({});
    expect(download).not.toHaveBeenCalled();
  });

  it("returns {} when witnessName is edited", async () => {
    const download = makeDownloader();
    const result = await signaturesForPreset(
      { ...PRESET_MCR, witnessName: "Someone Else" },
      { download },
    );
    expect(result).toEqual({});
    expect(download).not.toHaveBeenCalled();
  });

  it("returns {} when both names are edited", async () => {
    const download = makeDownloader();
    const result = await signaturesForPreset(
      { ...PRESET_MCR, signatoryName: "A", witnessName: "B" },
      { download },
    );
    expect(result).toEqual({});
    expect(download).not.toHaveBeenCalled();
  });
});
