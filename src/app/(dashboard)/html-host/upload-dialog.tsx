"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, FileCode } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/html-host/format";
import { checkSlug, createArtifact } from "./actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

// ─── Slug validation status type ─────────────────────────────────────────────

type SlugStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "unavailable"; reason: string; suggestion?: string };

// ─── UploadDialog ─────────────────────────────────────────────────────────────

export function UploadDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  // File state
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Slug state
  const [slug, setSlug] = React.useState("");
  const [slugStatus, setSlugStatus] = React.useState<SlugStatus>({ state: "idle" });

  // Submission state
  const [submitting, setSubmitting] = React.useState(false);

  // Race condition guard: a ref that increments on every checkSlug call
  const checkIdRef = React.useRef(0);

  // Debounce timer ref
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Reset state when dialog opens/closes ─────────────────────────────────

  function resetState() {
    setFile(null);
    setFileError(null);
    setIsDragging(false);
    setSlug("");
    setSlugStatus({ state: "idle" });
    setSubmitting(false);
    checkIdRef.current = 0;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetState();
    setOpen(nextOpen);
  }

  // ─── File handling ─────────────────────────────────────────────────────────

  function validateAndSetFile(f: File) {
    setFileError(null);

    const isHtml = f.name.toLowerCase().endsWith(".html");
    const isZip = f.name.toLowerCase().endsWith(".zip");
    const isMimeOk =
      !f.type ||
      f.type === "text/html" ||
      f.type === "application/zip" ||
      f.type === "application/x-zip-compressed";

    if ((!isHtml && !isZip) || !isMimeOk) {
      const msg = "Only .html or .zip files are accepted";
      setFileError(msg);
      toast.error(msg);
      return;
    }

    if (f.size > MAX_BYTES) {
      const msg = `File is too large (${formatBytes(f.size)}). Max 5 MB.`;
      setFileError(msg);
      toast.error(msg);
      return;
    }

    setFile(f);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
    // Reset the input value so the same file can be re-selected after clearing
    e.target.value = "";
  }

  function handleClearFile() {
    setFile(null);
    setFileError(null);
  }

  // Drag-and-drop handlers
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) validateAndSetFile(f);
  }

  // ─── Slug handling ─────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!slug) {
      setSlugStatus({ state: "idle" });
      return;
    }

    setSlugStatus({ state: "checking" });

    const thisId = ++checkIdRef.current;

    debounceRef.current = setTimeout(async () => {
      const result = await checkSlug(slug);
      // Ignore stale responses
      if (thisId !== checkIdRef.current) return;

      if (result.available) {
        setSlugStatus({ state: "available" });
      } else {
        setSlugStatus({
          state: "unavailable",
          reason: result.reason ?? "Unavailable",
          suggestion: result.suggestion,
        });
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [slug]);

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.toLowerCase();
    setSlug(raw);
  }

  function handleSlugPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").toLowerCase().replace(/\s+/g, "-");
    const el = e.currentTarget;
    const before = el.value.slice(0, el.selectionStart ?? el.value.length);
    const after = el.value.slice(el.selectionEnd ?? el.value.length);
    setSlug(before + pasted + after);
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  const canSubmit =
    !submitting &&
    file !== null &&
    fileError === null &&
    slugStatus.state === "available";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || !file) return;

    setSubmitting(true);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("slug", slug);

    const result = await createArtifact(formData);

    if (result.ok) {
      const absoluteUrl = `${window.location.origin}${result.url}`;
      setOpen(false);
      resetState();
      toast.success("Upload successful!", {
        description: result.url,
        action: {
          label: "Copy link",
          onClick: () => {
            navigator.clipboard.writeText(absoluteUrl).then(
              () => toast.success("Link copied"),
              () => toast.info(`Link: ${absoluteUrl}`)
            );
          },
        },
      });
      router.refresh();
    } else {
      setSubmitting(false);
      toast.error(result.error);

      if (result.field === "slug") {
        setSlugStatus({
          state: "unavailable",
          reason: result.error,
        });
      } else if (result.field === "file") {
        setFileError(result.error);
      }
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="shrink-0">
          <Upload className="h-4 w-4" />
          New upload
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload HTML artifact</DialogTitle>
          <DialogDescription>
            Single .html file or .zip bundle, max 5 MB. Bundles must contain
            index.html at the root.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Drop zone ── */}
          <div className="space-y-1.5">
            <Label>File</Label>

            {/* Hidden real file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.zip,text/html,application/zip"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleFileInputChange}
              disabled={submitting}
            />

            {file ? (
              /* Selected file display */
              <div className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm">
                <FileCode className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleClearFile}
                  disabled={submitting}
                  className="shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Remove selected file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* Drop zone */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "rounded-md border-2 border-dashed transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="flex w-full flex-col items-center gap-2 px-6 py-8 text-sm text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md disabled:pointer-events-none disabled:opacity-50"
                >
                  <Upload className="h-6 w-6" />
                  <span>
                    <span className="font-medium text-foreground">
                      Click to browse
                    </span>{" "}
                    or drag &amp; drop
                  </span>
                  <span className="text-xs">.html or .zip, max 5 MB</span>
                </button>
              </div>
            )}

            {/* File error */}
            {fileError && (
              <p className="text-xs text-destructive">{fileError}</p>
            )}
          </div>

          {/* ── Slug input ── */}
          <div className="space-y-1.5">
            <Label htmlFor="slug-input">URL slug</Label>
            <Input
              id="slug-input"
              value={slug}
              onChange={handleSlugChange}
              onPaste={handleSlugPaste}
              placeholder="my-artifact"
              autoComplete="off"
              spellCheck={false}
              disabled={submitting}
              aria-describedby="slug-preview slug-status"
            />

            {/* URL preview */}
            <p id="slug-preview" className="text-xs">
              <span className="text-muted-foreground">
                toolshed.mcrpathways.org/
              </span>
              <span className="font-medium text-foreground">
                {slug || <span className="text-muted-foreground italic">slug</span>}
              </span>
              <span className="text-muted-foreground">.html</span>
            </p>

            {/* Slug validation status */}
            <div id="slug-status" aria-live="polite" aria-atomic="true" className="min-h-[1rem]">
              {slugStatus.state === "checking" && (
                <p className="text-xs text-muted-foreground">Checking…</p>
              )}
              {slugStatus.state === "available" && (
                <p className="text-xs text-green-600 dark:text-green-400">Available</p>
              )}
              {slugStatus.state === "unavailable" && (
                <p className="text-xs text-destructive">
                  {slugStatus.reason}
                  {slugStatus.suggestion && (
                    <>
                      {" · Try "}
                      <button
                        type="button"
                        onClick={() => setSlug(slugStatus.suggestion!)}
                        className="underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                      >
                        {slugStatus.suggestion}
                      </button>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* ── Submit ── */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              "Upload & get link"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
