"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Intake } from "@/lib/dsa-builder/schema";

const MCR_FIELDS: { name: keyof Intake["mcr"]; label: string }[] = [
  { name: "signatoryName", label: "MCR signatory name" },
  { name: "signatoryPosition", label: "MCR signatory position" },
  { name: "signatoryDate", label: "MCR signatory date" },
  { name: "witnessName", label: "MCR witness name" },
  { name: "witnessPosition", label: "MCR witness position" },
  { name: "witnessDate", label: "MCR witness date" },
];

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  const isInsert = !value || value.trim() === "";
  return (
    <div className="grid grid-cols-3 gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "col-span-2 break-words",
          isInsert && "rounded bg-yellow-100 px-1 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100",
        )}
      >
        {isInsert ? "[insert]" : value}
      </dd>
    </div>
  );
}

export function Step4McrReview() {
  const form = useFormContext<Intake>();
  const values = form.watch();
  const isLA = values.counterpartyType === "LocalAuthority";

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">MCR signing</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {MCR_FIELDS.map((f) => (
            <FormField
              key={f.name}
              control={form.control}
              name={`mcr.${f.name}` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{f.label}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Review</h2>
        <p className="text-xs text-muted-foreground">
          Fields highlighted in yellow are still <code>[insert]</code> defaults
          — they will appear that way in the generated document. Click Back to
          fill them in now, or leave them for the counterparty to complete by
          hand.
        </p>
        <dl className="rounded-lg border border-border p-4">
          <ReviewRow label="Jurisdiction" value={values.jurisdiction} />
          <ReviewRow label="Counterparty type" value={values.counterpartyType} />
          <ReviewRow label="Counterparty legal name" value={values.counterparty.legalName} />
          <ReviewRow label="Counterparty short name" value={values.counterparty.shortName} />
          <ReviewRow label="Counterparty address" value={values.counterparty.address} />
          {isLA && (
            <ReviewRow
              label="Covered schools / sites"
              value={values.counterparty.coveredSchoolsSites}
            />
          )}
          <ReviewRow label="Signatory name" value={values.counterparty.signatoryName} />
          <ReviewRow label="Signatory position" value={values.counterparty.signatoryPosition} />
          <ReviewRow label="Signatory date" value={values.counterparty.signatoryDate} />
          <ReviewRow label="Witness name" value={values.counterparty.witnessName} />
          <ReviewRow label="Witness position" value={values.counterparty.witnessPosition} />
          <ReviewRow label="Witness date" value={values.counterparty.witnessDate} />
          <ReviewRow label="Day-to-day rep title" value={values.counterparty.repJobTitle} />
          <ReviewRow label="Day-to-day rep email" value={values.counterparty.repEmail} />
          <ReviewRow label="Escalation rep title" value={values.counterparty.escalationJobTitle} />
          <ReviewRow label="Escalation rep email" value={values.counterparty.escalationEmail} />
          <ReviewRow
            label="Criminal record"
            value={values.includeCriminalRecord ? "Included" : "Excluded"}
          />
          <ReviewRow
            label="S1/S2 groupwork"
            value={values.includeGroupwork ? "Included" : "Excluded"}
          />
          <ReviewRow
            label="Fundraising"
            value={values.includeFundraising ? "Included" : "Excluded"}
          />
          <ReviewRow label="MCR signatory" value={values.mcr.signatoryName} />
          <ReviewRow label="MCR signatory date" value={values.mcr.signatoryDate} />
          <ReviewRow label="MCR witness" value={values.mcr.witnessName} />
          <ReviewRow label="MCR witness date" value={values.mcr.witnessDate} />
        </dl>
      </section>
    </div>
  );
}
