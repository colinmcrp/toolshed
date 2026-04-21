import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listMyArtifacts } from "./actions";
import { ArtifactRow } from "./artifact-row";
import { formatBytes } from "@/lib/html-host/format";

export default async function HtmlHostPage() {
  const artifacts = await listMyArtifacts();

  const totalBytes = artifacts.reduce((sum, a) => sum + a.size_bytes, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">HTML Host</h1>
          <p className="text-sm text-muted-foreground">
            Upload .html files or .zip bundles and share them by link.
          </p>
          <p className="text-xs text-muted-foreground">
            {artifacts.length} artifact{artifacts.length !== 1 ? "s" : ""} ·{" "}
            {formatBytes(totalBytes)} total
          </p>
        </div>

        {/* TODO: wire to Task 9 dialog */}
        <Button disabled className="shrink-0">
          <Upload className="h-4 w-4" />
          New upload
        </Button>
      </div>

      {/* Content */}
      {artifacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium text-sm">No uploads yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click{" "}
              <span className="font-medium text-foreground">New upload</span> to
              get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {artifacts.map((artifact) => (
                <li key={artifact.id}>
                  <ArtifactRow artifact={artifact} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
