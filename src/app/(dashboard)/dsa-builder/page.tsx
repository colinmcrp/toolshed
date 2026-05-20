import { Wizard } from "./wizard";

export default function DsaBuilderPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          MCR Pathways · Legal &amp; Data
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">DSA Builder</h1>
        <p className="text-sm text-muted-foreground">
          Generate a Data Sharing Agreement as a downloadable Word document.
          Four steps; takes about three minutes for a standard council
          partnership.
        </p>
      </div>
      <Wizard />
    </div>
  );
}
