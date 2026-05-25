import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import ImageModule from "docxtemplater-image-module-free";
import type { RenderContext } from "./build-context";
import { dottedParser } from "./dotted-parser";

// Includes `%` so an unsubstituted image-module tag (e.g. {%mcrSignatoryImage})
// is caught by the post-render scan, not silently shipped.
const STRAY_TOKEN_RE = /\{[#^/%]?[A-Za-z][\w.]*\}/g;

// XML parts inside a .docx that docxtemplater substitutes into. Scanning
// only document.xml would miss broken tokens in headers, footers,
// footnotes, endnotes, or comments — none of which are templated today,
// but a future template edit could put one there and we want to catch it.
const SCANNED_PART_RE = /^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/;

function assertCleanRender(zip: PizZip): void {
  const partNames = Object.keys(zip.files).filter((name) =>
    SCANNED_PART_RE.test(name),
  );
  for (const name of partNames) {
    const xml = zip.file(name)?.asText() ?? "";
    const stray = xml.match(STRAY_TOKEN_RE);
    if (stray && stray.length > 0) {
      const unique = [...new Set(stray)];
      throw new Error(
        `DSA render produced unsubstituted tokens in ${name}: ${unique.join(", ")}`,
      );
    }
    if (xml.includes("undefined")) {
      throw new Error(
        `DSA render produced literal 'undefined' in ${name} — a nested placeholder did not resolve.`,
      );
    }
  }
}

export interface RenderImages {
  signatoryImage?: Uint8Array;
  witnessImage?: Uint8Array;
}

// docxtemplater-image-module-free treats an object-valued context entry as
// an already-rendered part (looking for .rId / .sizePixel keys). To pass
// real images we put a short string marker in the context and let
// getImage / getSize resolve it to the buffer and dimensions. Markers
// also encode the natural aspect ratio of each signature so getSize can
// return per-signer dimensions.
const IMAGE_MARKERS = {
  SIGNATORY: "mcr-signatory",
  WITNESS: "mcr-witness",
} as const;

// Width-locked at 200 px; height tuned per signature's natural aspect.
const SIGNATURE_SIZES: Record<string, [number, number]> = {
  [IMAGE_MARKERS.SIGNATORY]: [200, 82], // Sharon (1954×805, ≈2.43:1)
  [IMAGE_MARKERS.WITNESS]: [200, 96],   // Colin (1716×826, ≈2.08:1)
};

// Pure renderer — no network or fs I/O. Safe to call in tests.
export function renderToBuffer(
  template: ArrayBuffer | Buffer | Uint8Array,
  context: RenderContext,
  images: RenderImages = {},
): Uint8Array {
  const zip = new PizZip(template);

  const buffers: Record<string, Uint8Array | undefined> = {
    [IMAGE_MARKERS.SIGNATORY]: images.signatoryImage,
    [IMAGE_MARKERS.WITNESS]: images.witnessImage,
  };

  const imageModule = new ImageModule({
    centered: false,
    getImage(tagValue: unknown): Uint8Array {
      if (typeof tagValue !== "string" || !(tagValue in buffers)) {
        throw new Error(
          `DSA image module asked for unknown marker '${String(tagValue)}'`,
        );
      }
      const buf = buffers[tagValue];
      if (!buf) {
        throw new Error(
          `DSA image module asked for '${tagValue}' but no buffer was supplied — ` +
            `the conditional section guard should have prevented this.`,
        );
      }
      return buf;
    },
    getSize(_img: Uint8Array, tagValue: unknown): [number, number] {
      if (typeof tagValue !== "string") {
        throw new Error(`DSA image module getSize given non-string tagValue`);
      }
      const size = SIGNATURE_SIZES[tagValue];
      if (!size) {
        throw new Error(`No signature size registered for marker '${tagValue}'`);
      }
      return size;
    },
  });

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
    parser: dottedParser,
    modules: [imageModule],
  });

  doc.render({
    ...context,
    mcrHasSignatory: !!images.signatoryImage,
    mcrHasWitness: !!images.witnessImage,
    mcrSignatoryImage: images.signatoryImage
      ? IMAGE_MARKERS.SIGNATORY
      : undefined,
    mcrWitnessImage: images.witnessImage ? IMAGE_MARKERS.WITNESS : undefined,
  });

  assertCleanRender(doc.getZip());
  return doc.getZip().generate({ type: "uint8array", compression: "DEFLATE" });
}
