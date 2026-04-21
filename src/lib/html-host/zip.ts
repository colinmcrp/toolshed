/**
 * Zip extraction utilities for HTML artifact bundles.
 *
 * Server-side only — must not rely on browser APIs. zip.js is configured
 * with `useWebWorkers: false` for Node.js compatibility.
 *
 * Symlink detection limitation: zip.js exposes external file attributes
 * which encode Unix mode bits (including symlink type 0xA000). However,
 * parsing those attributes requires reading the high 16 bits of
 * `entry.externalFileAttribute`. We treat entries flagged as directories
 * (entry.directory === true) as skippable, but we do NOT attempt to detect
 * symlinks via attribute parsing to keep the implementation simple and
 * portable across zip.js versions. Symlinks packaged as regular files will
 * be extracted as opaque byte data.
 */

import { lookup } from 'mime-types';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ExtractedEntry {
  /** Relative path within the bundle, always uses forward slashes, never starts with `/`. */
  path: string;
  /** Raw file bytes. */
  data: Uint8Array;
  /** Best-effort content type from file extension. */
  mimeType: string;
}

export interface ExtractedBundle {
  entries: ExtractedEntry[];
  /** Sum of data.byteLength across all entries. */
  totalBytes: number;
}

export type ZipExtractionErrorCode =
  | 'missing-index-html'
  | 'path-traversal'
  | 'absolute-path'
  | 'size-exceeded'
  | 'invalid-zip'
  | 'empty-zip';

export class ZipExtractionError extends Error {
  constructor(
    public code: ZipExtractionErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ZipExtractionError';
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Normalise a raw zip entry name to a forward-slash relative path.
 * Returns the normalised string, or throws ZipExtractionError for
 * absolute-path or path-traversal violations.
 */
function normalisePath(raw: string): string {
  // Step 1: unify separators.
  let p = raw.replace(/\\/g, '/');

  // Step 2: strip a single leading `./` prefix if present.
  if (p.startsWith('./')) {
    p = p.slice(2);
  }

  // Step 3: reject absolute paths (starts with `/` or Windows drive letter).
  if (p.startsWith('/') || /^[A-Za-z]:/.test(p)) {
    throw new ZipExtractionError(
      'absolute-path',
      `Entry has an absolute path: ${raw}`,
    );
  }

  // Step 4: reject any `..` segment (don't try to resolve, reject outright).
  const segments = p.split('/');
  for (const seg of segments) {
    if (seg === '..') {
      throw new ZipExtractionError(
        'path-traversal',
        `Entry contains a path-traversal segment: ${raw}`,
      );
    }
  }

  return p;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Extract and validate an HTML artifact bundle from a zip Blob.
 *
 * @param file     The zip file as a Blob or File.
 * @param maxBytes Maximum allowed total uncompressed size across all entries.
 * @returns        Validated bundle with all file entries (directories excluded).
 * @throws         ZipExtractionError for any validation failure.
 */
export async function extractArtifactBundle(
  file: Blob,
  maxBytes: number,
): Promise<ExtractedBundle> {
  const zipModule = await import('@zip.js/zip.js');
  zipModule.configure({ useWebWorkers: false });
  const { ZipReader, BlobReader, Uint8ArrayWriter } = zipModule;

  let reader: InstanceType<typeof ZipReader>;
  try {
    reader = new ZipReader(new BlobReader(file));
  } catch (err) {
    throw new ZipExtractionError('invalid-zip', 'Failed to open zip file', {
      cause: err,
    });
  }

  try {
    let rawEntries: Awaited<ReturnType<typeof reader.getEntries>>;
    try {
      rawEntries = await reader.getEntries();
    } catch (err) {
      throw new ZipExtractionError('invalid-zip', 'Failed to parse zip entries', {
        cause: err,
      });
    }

    if (rawEntries.length === 0) {
      throw new ZipExtractionError('empty-zip', 'The zip archive contains no entries');
    }

    const entries: ExtractedEntry[] = [];
    let totalBytes = 0;
    let hasIndexHtml = false;

    for (const entry of rawEntries) {
      // Skip directory entries.
      if (entry.directory) {
        continue;
      }

      const normPath = normalisePath(entry.filename);

      // Skip directory-like entries that slipped through (trailing slash after normalisation).
      if (normPath.endsWith('/') || normPath === '') {
        continue;
      }

      if (normPath === 'index.html') {
        hasIndexHtml = true;
      }

      const data = await entry.getData!(new Uint8ArrayWriter());

      totalBytes += data.byteLength;
      if (totalBytes > maxBytes) {
        throw new ZipExtractionError(
          'size-exceeded',
          `Uncompressed bundle size exceeds the ${maxBytes}-byte limit`,
        );
      }

      const mimeType = lookup(normPath) || 'application/octet-stream';

      entries.push({ path: normPath, data, mimeType });
    }

    if (!hasIndexHtml) {
      throw new ZipExtractionError(
        'missing-index-html',
        'The bundle must contain an index.html at the zip root',
      );
    }

    return { entries, totalBytes };
  } finally {
    await reader.close();
  }
}
