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
] as const;

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
                  // If switching back to Scotland, force counterparty back to LA.
                  if (value === "Scotland") {
                    form.setValue("counterpartyType", "LocalAuthority", {
                      shouldValidate: true,
                    });
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
                  const disabled = isScotland && opt.value !== "LocalAuthority";
                  return (
                    <div
                      key={opt.value}
                      className="flex items-center gap-2"
                      data-disabled={disabled || undefined}
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
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
