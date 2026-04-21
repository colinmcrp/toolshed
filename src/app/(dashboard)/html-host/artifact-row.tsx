"use client";

import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteArtifact } from "./actions";
import { formatBytes, formatRelative } from "@/lib/html-host/format";
import type { HtmlArtifact } from "@/types/database";

interface ArtifactRowProps {
  artifact: HtmlArtifact;
}

export function ArtifactRow({ artifact }: ArtifactRowProps) {
  const router = useRouter();

  const path = artifact.is_bundle
    ? `/${artifact.slug}/`
    : `/${artifact.slug}.html`;

  function handleCopyLink() {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(
      () => {
        toast.success("Link copied");
      },
      () => {
        // Clipboard write failed — show the URL in the toast as fallback
        toast.info(`Link: ${url}`);
      }
    );
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${artifact.original_name ?? artifact.slug}"? This cannot be undone.`
    );
    if (!confirmed) return;

    const result = await deleteArtifact(artifact.id);
    if (result.ok) {
      toast.success("Artifact deleted");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to delete artifact");
    }
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      {/* Slug + filename */}
      <div className="min-w-0 flex-1">
        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate font-medium text-sm hover:underline"
        >
          {artifact.slug}
        </a>
        <p className="truncate text-xs text-muted-foreground mt-0.5">
          {artifact.original_name ?? "—"}
        </p>
      </div>

      {/* Type badge */}
      {artifact.is_bundle ? (
        <Badge
          variant="outline"
          className="shrink-0 border-orange-400 text-orange-600 dark:text-orange-400"
        >
          bundle
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="shrink-0 border-blue-400 text-blue-600 dark:text-blue-400"
        >
          html
        </Badge>
      )}

      {/* Size */}
      <span className="shrink-0 text-xs text-muted-foreground w-16 text-right">
        {formatBytes(artifact.size_bytes)}
      </span>

      {/* Relative time */}
      <span className="shrink-0 text-xs text-muted-foreground w-20 text-right hidden sm:block">
        {formatRelative(artifact.created_at)}
      </span>

      {/* Action buttons */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Copy link"
          onClick={handleCopyLink}
        >
          <Copy className="h-3.5 w-3.5" />
          <span className="sr-only">Copy link</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Open in new tab"
          asChild
        >
          <a href={path} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="sr-only">Open</span>
          </a>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title="Delete"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  );
}
