import { describe, it, expect } from 'vitest';
import {
  extractArtifactBundle,
  ZipExtractionError,
  type ExtractedBundle,
} from './zip';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

async function makeZip(
  entries: Array<{ path: string; content: string | Uint8Array }>,
): Promise<Blob> {
  const zip = await import('@zip.js/zip.js');
  zip.configure({ useWebWorkers: false });
  const { ZipWriter, BlobWriter, TextReader, Uint8ArrayReader } = zip;
  const out = new BlobWriter('application/zip');
  const writer = new ZipWriter(out);
  for (const e of entries) {
    const r =
      typeof e.content === 'string'
        ? new TextReader(e.content)
        : new Uint8ArrayReader(e.content);
    await writer.add(e.path, r);
  }
  return await writer.close();
}

/** Produces a Blob of random bytes that is not a valid zip. */
function makeInvalidZip(): Blob {
  return new Blob([new Uint8Array([0x00, 0x01, 0x02, 0x03])], {
    type: 'application/zip',
  });
}

/** Produces an empty Blob (0 bytes). */
function makeEmptyZip(): Blob {
  return new Blob([], { type: 'application/zip' });
}

const BIG_LIMIT = 10 * 1024 * 1024; // 10 MB — effectively uncapped for most tests

// ─── Happy-path tests ─────────────────────────────────────────────────────────

describe('extractArtifactBundle — valid bundles', () => {
  it('returns entries with correct paths, mimeTypes and totalBytes for index.html + nested asset', async () => {
    const htmlContent = '<html><body>Hello</body></html>';
    const cssContent = 'body { color: red; }';
    const blob = await makeZip([
      { path: 'index.html', content: htmlContent },
      { path: 'styles/main.css', content: cssContent },
    ]);

    const bundle = await extractArtifactBundle(blob, BIG_LIMIT);

    expect(bundle.entries).toHaveLength(2);

    const htmlEntry = bundle.entries.find((e) => e.path === 'index.html');
    expect(htmlEntry).toBeDefined();
    expect(htmlEntry!.mimeType).toBe('text/html');

    const cssEntry = bundle.entries.find((e) => e.path === 'styles/main.css');
    expect(cssEntry).toBeDefined();
    expect(cssEntry!.mimeType).toBe('text/css');

    // totalBytes should equal sum of uncompressed byte lengths
    const expectedTotal =
      new TextEncoder().encode(htmlContent).byteLength +
      new TextEncoder().encode(cssContent).byteLength;
    expect(bundle.totalBytes).toBe(expectedTotal);
  });

  it('returns an SVG entry with image/svg+xml mime type', async () => {
    const blob = await makeZip([
      { path: 'index.html', content: '<html/>' },
      { path: 'logo.svg', content: '<svg/>' },
    ]);

    const bundle = await extractArtifactBundle(blob, BIG_LIMIT);
    const svgEntry = bundle.entries.find((e) => e.path === 'logo.svg');
    expect(svgEntry).toBeDefined();
    expect(svgEntry!.mimeType).toBe('image/svg+xml');
  });

  it('accepts a bundle with only index.html', async () => {
    const blob = await makeZip([{ path: 'index.html', content: '<!doctype html>' }]);
    const bundle = await extractArtifactBundle(blob, BIG_LIMIT);
    expect(bundle.entries).toHaveLength(1);
    expect(bundle.entries[0].path).toBe('index.html');
  });

  it('normalises Windows-style backslash paths to forward slashes', async () => {
    // zip.js adds the entry with a backslash in the name — we normalise on read.
    const blob = await makeZip([
      { path: 'index.html', content: '<html/>' },
      { path: 'foo\\bar.txt', content: 'data' },
    ]);

    const bundle = await extractArtifactBundle(blob, BIG_LIMIT);
    const barEntry = bundle.entries.find((e) => e.path === 'foo/bar.txt');
    expect(barEntry).toBeDefined();
  });

  it('strips leading ./ prefix from entry paths', async () => {
    const blob = await makeZip([
      { path: 'index.html', content: '<html/>' },
      { path: './foo.html', content: '<html/>' },
    ]);

    const bundle = await extractArtifactBundle(blob, BIG_LIMIT);
    const fooEntry = bundle.entries.find((e) => e.path === 'foo.html');
    expect(fooEntry).toBeDefined();
    // Make sure the leading ./ is gone
    expect(bundle.entries.every((e) => !e.path.startsWith('./'))).toBe(true);
  });

  it('skips directory entries and does not include them in output', async () => {
    const blob = await makeZip([
      { path: 'index.html', content: '<html/>' },
      // zip.js adds a directory entry when a path ends with /
      { path: 'assets/', content: '' },
      { path: 'assets/img.png', content: 'PNG' },
    ]);

    const bundle = await extractArtifactBundle(blob, BIG_LIMIT);
    const paths = bundle.entries.map((e) => e.path);
    expect(paths).not.toContain('assets/');
    expect(paths).toContain('index.html');
    expect(paths).toContain('assets/img.png');
  });

  it('returns correct data bytes for each entry', async () => {
    const content = 'hello world';
    const blob = await makeZip([{ path: 'index.html', content }]);
    const bundle = await extractArtifactBundle(blob, BIG_LIMIT);
    const expected = new TextEncoder().encode(content);
    // Compare as plain arrays to avoid subtype mismatches (zip.js may return
    // a Uint8Array subclass depending on the version/platform).
    expect(Array.from(bundle.entries[0].data)).toEqual(Array.from(expected));
  });
});

// ─── Validation-error tests ───────────────────────────────────────────────────

describe('extractArtifactBundle — missing-index-html', () => {
  it('throws when no index.html exists at all', async () => {
    const blob = await makeZip([{ path: 'about.html', content: '<html/>' }]);
    await expect(extractArtifactBundle(blob, BIG_LIMIT)).rejects.toMatchObject({
      name: 'ZipExtractionError',
      code: 'missing-index-html',
    });
  });

  it('throws when index.html is nested inside a sub-folder', async () => {
    const blob = await makeZip([{ path: 'site/index.html', content: '<html/>' }]);
    await expect(extractArtifactBundle(blob, BIG_LIMIT)).rejects.toMatchObject({
      name: 'ZipExtractionError',
      code: 'missing-index-html',
    });
  });
});

describe('extractArtifactBundle — path-traversal', () => {
  it('throws for an entry name starting with ../', async () => {
    const blob = await makeZip([
      { path: 'index.html', content: '<html/>' },
      { path: '../evil.txt', content: 'bad' },
    ]);
    await expect(extractArtifactBundle(blob, BIG_LIMIT)).rejects.toMatchObject({
      name: 'ZipExtractionError',
      code: 'path-traversal',
    });
  });

  it('throws for an entry name with .. in the middle of the path', async () => {
    const blob = await makeZip([
      { path: 'index.html', content: '<html/>' },
      { path: 'foo/../bar', content: 'bad' },
    ]);
    await expect(extractArtifactBundle(blob, BIG_LIMIT)).rejects.toMatchObject({
      name: 'ZipExtractionError',
      code: 'path-traversal',
    });
  });
});

describe('extractArtifactBundle — absolute-path', () => {
  it('throws for an entry name starting with /', async () => {
    const blob = await makeZip([
      { path: 'index.html', content: '<html/>' },
      { path: '/evil.txt', content: 'bad' },
    ]);
    await expect(extractArtifactBundle(blob, BIG_LIMIT)).rejects.toMatchObject({
      name: 'ZipExtractionError',
      code: 'absolute-path',
    });
  });
});

describe('extractArtifactBundle — size-exceeded', () => {
  it('throws when total uncompressed bytes exceed maxBytes', async () => {
    // 10 bytes per entry, 2 entries → 20 bytes; limit is 15
    const entry1 = 'AAAAAAAAAA'; // 10 bytes
    const entry2 = 'BBBBBBBBBB'; // 10 bytes
    const blob = await makeZip([
      { path: 'index.html', content: entry1 },
      { path: 'other.html', content: entry2 },
    ]);
    await expect(extractArtifactBundle(blob, 15)).rejects.toMatchObject({
      name: 'ZipExtractionError',
      code: 'size-exceeded',
    });
  });

  it('does not throw when total uncompressed bytes equal maxBytes exactly', async () => {
    const content = 'AAAAAAAAAA'; // 10 bytes
    const blob = await makeZip([{ path: 'index.html', content }]);
    await expect(
      extractArtifactBundle(blob, new TextEncoder().encode(content).byteLength),
    ).resolves.toBeDefined();
  });
});

describe('extractArtifactBundle — empty-zip', () => {
  it('throws for a zip with zero entries', async () => {
    const blob = await makeZip([]);
    await expect(extractArtifactBundle(blob, BIG_LIMIT)).rejects.toMatchObject({
      name: 'ZipExtractionError',
      code: 'empty-zip',
    });
  });
});

describe('extractArtifactBundle — invalid-zip', () => {
  it('throws for a malformed/non-zip blob', async () => {
    await expect(
      extractArtifactBundle(makeInvalidZip(), BIG_LIMIT),
    ).rejects.toMatchObject({
      name: 'ZipExtractionError',
      code: 'invalid-zip',
    });
  });

  it('throws for a completely empty blob', async () => {
    await expect(
      extractArtifactBundle(makeEmptyZip(), BIG_LIMIT),
    ).rejects.toMatchObject({
      name: 'ZipExtractionError',
      code: 'invalid-zip',
    });
  });
});
