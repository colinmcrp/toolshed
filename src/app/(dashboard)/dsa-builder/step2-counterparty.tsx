"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Intake } from "@/lib/dsa-builder/schema";

type Field = {
  name: keyof Intake["counterparty"];
  label: string;
  required?: boolean;
  type?: "email";
};

const LEGAL_IDENTITY: Field[] = [
  { name: "legalName", label: "Legal name", required: true },
  { name: "shortName", label: "Short name", required: true },
  { name: "address", label: "Address", required: true },
];

const SIGNATORY: Field[] = [
  { name: "signatoryName", label: "Signatory name" },
  { name: "signatoryPosition", label: "Signatory position" },
  { name: "signatoryDate", label: "Signatory date" },
  { name: "signatoryPlace", label: "Place of signing" },
  { name: "witnessName", label: "Witness name" },
  { name: "witnessPosition", label: "Witness position" },
  { name: "witnessDate", label: "Witness date" },
  { name: "witnessAddress", label: "Witness address" },
];

const CONTACTS: Field[] = [
  { name: "repJobTitle", label: "Day-to-day contact — job title" },
  { name: "repAddress", label: "Day-to-day contact — address" },
  { name: "repEmail", label: "Day-to-day contact — email", type: "email" },
  { name: "repPhone", label: "Day-to-day contact — phone" },
  { name: "escalationJobTitle", label: "Escalation contact — job title" },
  { name: "escalationAddress", label: "Escalation contact — address" },
  { name: "escalationEmail", label: "Escalation contact — email", type: "email" },
  { name: "escalationPhone", label: "Escalation contact — phone" },
];

function TextField({ field }: { field: Field }) {
  const form = useFormContext<Intake>();
  return (
    <FormField
      control={form.control}
      name={`counterparty.${field.name}` as const}
      render={({ field: f }) => (
        <FormItem>
          <FormLabel>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </FormLabel>
          <FormControl>
            <Input type={field.type ?? "text"} {...f} value={f.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function Section({ title, fields }: { title: string; fields: Field[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <TextField key={f.name} field={f} />
        ))}
      </div>
    </section>
  );
}

export function Step2Counterparty() {
  const form = useFormContext<Intake>();
  const isLA = form.watch("counterpartyType") === "LocalAuthority";

  return (
    <div className="space-y-6">
      <Section title="Legal identity" fields={LEGAL_IDENTITY} />
      <Section title="Signatory" fields={SIGNATORY} />
      <Section title="Day-to-day contacts" fields={CONTACTS} />

      {isLA && (
        <FormField
          control={form.control}
          name="counterparty.coveredSchoolsSites"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Schools and alternative provision sites covered
                <span className="text-destructive"> *</span>
              </FormLabel>
              <FormDescription>
                Populates Schedule Part 8. A standing description such as
                &ldquo;All [Council name] secondary schools where MCR is present
                and delivering the MCR Programme&rdquo; means newly-added
                schools are covered automatically — no variation letter
                needed.
              </FormDescription>
              <FormControl>
                <Textarea rows={4} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
