"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Intake } from "@/lib/dsa-builder/schema";
import { ScotlandPathwayHelp } from "./scotland-pathway-dialog";

const COUNTERPARTY_OPTIONS = [
  { value: "LocalAuthority", label: "Local Authority" },
  { value: "MaintainedSchool", label: "Maintained school" },
  { value: "AcademyOrFreeSchool", label: "Academy / free school" },
  { value: "IndependentSchool", label: "Independent school" },
  { value: "CharityPartner", label: "Charity partner" },
] as const;

const SCOTLAND_ALLOWED_TYPES = new Set([
  "LocalAuthority",
  "CharityPartner",
]);

export function Step1Jurisdiction() {
  const form = useFormContext<Intake>();
  const jurisdiction = form.watch("jurisdiction");
  const isScotland = jurisdiction === "Scotland";

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="jurisdiction"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Jurisdiction</FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  // Scotland: state schools can't sign their own DSA. If the
                  // current selection isn't one of the Scotland-valid types
                  // (LA, CharityPartner), reset to LA. Groupwork applies in
                  // both jurisdictions (clause rewritten S1/S2 ↔ Y7/Y8 at
                  // render time), so we don't reset the groupwork choice.
                  if (value === "Scotland") {
                    const current = form.getValues("counterpartyType");
                    if (!SCOTLAND_ALLOWED_TYPES.has(current)) {
                      form.setValue("counterpartyType", "LocalAuthority", {
                        shouldValidate: true,
                      });
                    }
                  }
                }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Scotland" id="jurisdiction-scotland" />
                  <Label htmlFor="jurisdiction-scotland">Scotland</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="England" id="jurisdiction-england" />
                  <Label htmlFor="jurisdiction-england">England</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="counterpartyType"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1">
              <FormLabel>Counterparty type</FormLabel>
              {isScotland && <ScotlandPathwayHelp />}
            </div>
            <FormControl>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-col gap-2"
              >
                {COUNTERPARTY_OPTIONS.map((opt) => {
                  const disabled =
                    isScotland && !SCOTLAND_ALLOWED_TYPES.has(opt.value);
                  return (
                    <div
                      key={opt.value}
                      className="flex items-center gap-2"
                    >
                      <RadioGroupItem
                        value={opt.value}
                        id={`counterparty-${opt.value}`}
                        disabled={disabled}
                      />
                      <Label
                        htmlFor={`counterparty-${opt.value}`}
                        className={disabled ? "text-muted-foreground" : ""}
                      >
                        {opt.label}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </FormControl>
            {isScotland && (
              <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-muted-foreground">
                Scottish state schools have no separate legal personality from
                their local authority — the LA route is for state-school
                partnerships, and the charity-partner route is for charity-
                to-charity arrangements. Open the help icon above for the full
                state-school pathway.
              </p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
