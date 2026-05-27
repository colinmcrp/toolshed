"use client";

import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { localAuthoritiesFor } from "@/lib/dsa-builder/local-authorities";
import type { Intake } from "@/lib/dsa-builder/schema";

type Field = {
  name: keyof Intake["counterparty"];
  label: string;
  required?: boolean;
  type?: "email" | "date";
};

const LEGAL_IDENTITY: Field[] = [
  { name: "legalName", label: "Legal name", required: true },
  { name: "shortName", label: "Short name", required: true },
  { name: "address", label: "Address", required: true },
];

const SIGNATORY: Field[] = [
  { name: "signatoryName", label: "Signatory name" },
  { name: "signatoryPosition", label: "Signatory position" },
  { name: "signatoryDate", label: "Signatory date", type: "date" },
  { name: "signatoryPlace", label: "Place of signing" },
  { name: "witnessName", label: "Witness name" },
  { name: "witnessPosition", label: "Witness position" },
  { name: "witnessDate", label: "Witness date", type: "date" },
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

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function FieldGrid({ fields }: { fields: Field[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((f) => (
        <TextField key={f.name} field={f} />
      ))}
    </div>
  );
}

function LocalAuthorityPicker() {
  const form = useFormContext<Intake>();
  const jurisdiction = form.watch("jurisdiction");
  const legalName = form.watch("counterparty.legalName") ?? "";
  const [open, setOpen] = useState(false);

  const authorities = useMemo(
    () => localAuthoritiesFor(jurisdiction),
    [jurisdiction],
  );
  const matched = useMemo(
    () => authorities.find((a) => a.name === legalName),
    [authorities, legalName],
  );

  return (
    <FormItem className="sm:col-span-2">
      <FormLabel>Pick from {jurisdiction} local authorities</FormLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              !matched && "text-muted-foreground",
            )}
          >
            {matched ? matched.name : "Search by name…"}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <Command>
            <CommandInput placeholder="Search local authorities…" />
            <CommandList>
              <CommandEmpty>No matches.</CommandEmpty>
              <CommandGroup>
                {authorities.map((la) => (
                  <CommandItem
                    key={la.name}
                    value={`${la.name} ${la.address}`}
                    onSelect={() => {
                      form.setValue("counterparty.legalName", la.name, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      form.setValue("counterparty.address", la.address, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        matched?.name === la.name ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{la.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {la.address}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <FormDescription className="text-xs">
        Selecting an authority pre-fills the legal name and address — both
        remain editable below.
      </FormDescription>
    </FormItem>
  );
}

export function Step2Counterparty() {
  const form = useFormContext<Intake>();
  const counterpartyType = form.watch("counterpartyType");
  const isLA = counterpartyType === "LocalAuthority";
  const isCharity = counterpartyType === "CharityPartner";
  const willSign = form.watch("counterpartyWillSign") !== false;

  return (
    <div className="space-y-6">
      <Section title="Legal identity">
        <div className="grid gap-3 sm:grid-cols-2">
          {isLA && <LocalAuthorityPicker />}
          {LEGAL_IDENTITY.map((f) => (
            <TextField key={f.name} field={f} />
          ))}
        </div>
        {isCharity && (
          <FormField
            control={form.control}
            name="counterparty.legalDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Legal status description
                  <span className="text-destructive"> *</span>
                </FormLabel>
                <FormDescription>
                  Free-text describing the charity&apos;s legal status — e.g.
                  &ldquo;a company limited by guarantee registered in Scotland
                  (company number SCxxxxxx) and a Scottish charity regulated
                  by OSCR, charity number SCxxxxxx&rdquo;.
                </FormDescription>
                <FormControl>
                  <Textarea rows={3} {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </Section>

      {isCharity && (
        <Section
          title="Background"
          description="Optional partner-specific paragraph inserted into the recitals between the &ldquo;Counterparty Activities&rdquo; anchor and the standard &ldquo;MCR delivers…&rdquo; paragraph. Leave blank to omit the paragraph entirely."
        >
          <FormField
            control={form.control}
            name="counterparty.background"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Background paragraph</FormLabel>
                <FormControl>
                  <Textarea rows={5} {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Section>
      )}

      <Section
        title="Signatory"
        description="The named individual on the counterparty side who will sign the DSA, and the witness to their signature."
      >
        <FormField
          control={form.control}
          name="counterpartyWillSign"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="space-y-1">
                <FormLabel className="text-sm">
                  Collect counterparty signing and contact details now
                </FormLabel>
                <FormDescription className="text-xs">
                  Turn off if the counterparty will fill in their name, date,
                  witness and day-to-day contacts by hand at signing. The
                  generated DSA will show <code>[insert]</code> placeholders
                  for them to complete.
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
        {willSign && <FieldGrid fields={SIGNATORY} />}
      </Section>

      {willSign && (
        <Section title="Day-to-day contacts">
          <FieldGrid fields={CONTACTS} />
        </Section>
      )}

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
