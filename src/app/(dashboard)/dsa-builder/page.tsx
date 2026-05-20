import { Wizard } from "./wizard";

export default function DsaBuilderPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          DSA Builder
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate a Data Sharing Agreement as a downloadable Word document.
        </p>
      </div>
      <Wizard />
    </div>
  );
}
