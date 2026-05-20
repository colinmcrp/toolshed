"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import type { Intake } from "@/lib/dsa-builder/schema";

type ScopeField = {
  name: "includeCriminalRecord" | "includeGroupwork" | "includeFundraising";
  label: string;
  description: string;
};

const FIELDS: ScopeField[] = [
  {
    name: "includeCriminalRecord",
    label: "Include criminal record data",
    description:
      "Includes the criminal record bullet in Schedule Part 1 and the Article 10 row in the legal-basis table. Turn off only if MCR has been told not to receive criminal record data for this partnership.",
  },
  {
    name: "includeGroupwork",
    label: "Include S1/S2 groupwork programme",
    description:
      "Includes the S1/S2 (Year 7/Year 8) groupwork programme description in Schedule Part 7 and changes the count of core programme aspects to two.",
  },
  {
    name: "includeFundraising",
    label: "Include fundraising in marketing legal basis",
    description:
      "Adds \"/fundraising\" to the Schedule Part 2 marketing/recruitment legal-basis line.",
  },
];

export function Step3Scope() {
  const form = useFormContext<Intake>();

  return (
    <div className="space-y-4">
      {FIELDS.map((f) => (
        <FormField
          key={f.name}
          control={form.control}
          name={f.name}
          render={({ field }) => (
            <FormItem className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div className="space-y-1">
                <FormLabel className="text-sm">{f.label}</FormLabel>
                <FormDescription className="text-xs">
                  {f.description}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
