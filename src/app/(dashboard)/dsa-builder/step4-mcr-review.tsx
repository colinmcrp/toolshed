"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { RotateCcw } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { todayIso } from "@/lib/dsa-builder/build-context";
import { MCR_SIGNER_PRESET } from "@/lib/dsa-builder/defaults";
import type { Intake } from "@/lib/dsa-builder/schema";

const MCR_FIELDS: {
  name: keyof Intake["mcr"];
  label: string;
  type?: "date";
}[] = [
  { name: "signatoryName", label: "MCR signatory name" },
  { name: "signatoryPosition", label: "MCR signatory position" },
  { name: "signatoryDate", label: "MCR signatory date", type: "date" },
  { name: "witnessName", label: "MCR witness name" },
  { name: "witnessPosition", label: "MCR witness position" },
  { name: "witnessDate", label: "MCR witness date", type: "date" },
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
  // Steps 1–3 fields are immutable on this screen (user must press Back
  // to edit them, which unmounts Step4). Read them once via getValues().
  // Only the MCR block + counterpartyWillSign are watched for live updates.
  const snapshot = form.getValues();
  const mcr = useWatch({ control: form.control, name: "mcr" });
  const willSign = useWatch({
    control: form.control,
    name: "counterpartyWillSign",
  }) !== false;
  const isLA = snapshot.counterpartyType === "LocalAuthority";
  const isCharity = snapshot.counterpartyType === "CharityPartner";

  const resetMcrDefaults = () => {
    const today = todayIso();
    form.setValue(
      "mcr",
      { ...MCR_SIGNER_PRESET, signatoryDate: today, witnessDate: today },
      { shouldValidate: true, shouldDirty: true },
    );
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold tracking-tight">MCR signing</h2>
            <p className="text-xs text-muted-foreground">
              Pre-filled with {MCR_SIGNER_PRESET.signatoryName} (
              {MCR_SIGNER_PRESET.signatoryPosition}) signing and{" "}
              {MCR_SIGNER_PRESET.witnessName} (
              {MCR_SIGNER_PRESET.witnessPosition}) witnessing. Edit if a
              different MCR signatory applies to this agreement.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetMcrDefaults}
            className="h-8 shrink-0 gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
        </div>
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
                    <Input
                      type={f.type ?? "text"}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold tracking-tight">Review</h2>
          <FormDescription className="text-xs">
            Fields highlighted in yellow are still <code>[insert]</code>{" "}
            defaults — they will appear that way in the generated document.
            Click Back to fill them in now, or leave them for the counterparty
            to complete by hand.
          </FormDescription>
        </div>
        <dl className="rounded-lg border border-border p-4">
          <ReviewRow label="Jurisdiction" value={snapshot.jurisdiction} />
          <ReviewRow label="Counterparty type" value={snapshot.counterpartyType} />
          <ReviewRow label="Counterparty legal name" value={snapshot.counterparty.legalName} />
          <ReviewRow label="Counterparty short name" value={snapshot.counterparty.shortName} />
          <ReviewRow label="Counterparty address" value={snapshot.counterparty.address} />
          {isLA && (
            <ReviewRow
              label="Covered schools / sites"
              value={snapshot.counterparty.coveredSchoolsSites}
            />
          )}
          {isCharity && (
            <ReviewRow
              label="Legal status"
              value={snapshot.counterparty.legalDescription}
            />
          )}
          {isCharity && (
            <ReviewRow
              label="Background paragraph"
              value={
                snapshot.counterparty.background?.trim()
                  ? snapshot.counterparty.background
                  : "Omitted from recitals"
              }
            />
          )}
          {willSign ? (
            <>
              <ReviewRow label="Signatory name" value={snapshot.counterparty.signatoryName} />
              <ReviewRow label="Signatory position" value={snapshot.counterparty.signatoryPosition} />
              <ReviewRow label="Signatory date" value={snapshot.counterparty.signatoryDate} />
              <ReviewRow label="Witness name" value={snapshot.counterparty.witnessName} />
              <ReviewRow label="Witness position" value={snapshot.counterparty.witnessPosition} />
              <ReviewRow label="Witness date" value={snapshot.counterparty.witnessDate} />
              <ReviewRow label="Day-to-day rep title" value={snapshot.counterparty.repJobTitle} />
              <ReviewRow label="Day-to-day rep email" value={snapshot.counterparty.repEmail} />
              <ReviewRow label="Escalation rep title" value={snapshot.counterparty.escalationJobTitle} />
              <ReviewRow label="Escalation rep email" value={snapshot.counterparty.escalationEmail} />
            </>
          ) : (
            <ReviewRow
              label="Counterparty signing and contacts"
              value="Counterparty completes by hand"
            />
          )}
          <ReviewRow
            label="Criminal record"
            value={snapshot.includeCriminalRecord ? "Included" : "Excluded"}
          />
          {!isCharity && (
            <>
              <ReviewRow
                label="S1/S2 (Y7/Y8) groupwork"
                value={snapshot.includeGroupwork ? "Included" : "Excluded"}
              />
              <ReviewRow
                label="Fundraising"
                value={snapshot.includeFundraising ? "Included" : "Excluded"}
              />
            </>
          )}
          <ReviewRow label="MCR signatory" value={mcr?.signatoryName} />
          <ReviewRow label="MCR signatory date" value={mcr?.signatoryDate} />
          <ReviewRow label="MCR witness" value={mcr?.witnessName} />
          <ReviewRow label="MCR witness date" value={mcr?.witnessDate} />
        </dl>
      </section>
    </div>
  );
}
