"use client";

import { z } from "zod";
import { useState } from "react";
import { FormProvider, useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IntakeSchema, type Intake } from "@/lib/dsa-builder/schema";
import { generateAndDownload } from "@/lib/dsa-builder/render";
import { Stepper } from "./stepper";
import { Step1Jurisdiction } from "./step1-jurisdiction";
import { Step2Counterparty } from "./step2-counterparty";
import { Step3Scope } from "./step3-scope";
import { Step4McrReview } from "./step4-mcr-review";

type IntakeInput = z.input<typeof IntakeSchema>;

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildDefaultValues(): IntakeInput {
  const today = todayIso();
  return {
    jurisdiction: "Scotland",
    counterpartyType: "LocalAuthority",
    counterpartyWillSign: true,
    includeCriminalRecord: true,
    includeGroupwork: true,
    includeFundraising: true,
    counterparty: {
      legalName: "",
      shortName: "",
      address: "",
      signatoryName: "",
      signatoryPosition: "",
      signatoryDate: today,
      signatoryPlace: "",
      witnessName: "",
      witnessPosition: "",
      witnessDate: today,
      witnessAddress: "",
      repJobTitle: "",
      repAddress: "",
      repEmail: "",
      repPhone: "",
      escalationJobTitle: "",
      escalationAddress: "",
      escalationEmail: "",
      escalationPhone: "",
      coveredSchoolsSites: "",
    },
    mcr: {
      signatoryName: "Sharon McIntyre",
      signatoryPosition: "Chief Executive Officer",
      signatoryDate: today,
      witnessName: "Colin Adam",
      witnessPosition: "Head of Solutions",
      witnessDate: today,
    },
  };
}

const STEP_FIELDS: Record<number, Path<IntakeInput>[]> = {
  0: ["jurisdiction", "counterpartyType"],
  1: ["counterparty", "counterpartyWillSign"],
  2: ["includeCriminalRecord", "includeGroupwork", "includeFundraising"],
  3: ["mcr"],
};

const STEP_META = [
  {
    title: "Jurisdiction",
    description:
      "Where the counterparty operates and what kind of organisation they are — drives the legal text and which schedule structure applies.",
  },
  {
    title: "Counterparty details",
    description:
      "Names, addresses, signatories and day-to-day contacts. Required fields are marked; the rest fall back to [insert] placeholders the counterparty can complete by hand.",
  },
  {
    title: "Scope",
    description:
      "Optional sections of the DSA. Off-by-default for England; check each toggle against what MCR has actually agreed for this partnership.",
  },
  {
    title: "MCR sign-off & review",
    description:
      "MCR's signatory and witness for the agreement, followed by a final review of every field that will appear in the rendered document.",
  },
] as const;

const LAST_STEP = STEP_META.length - 1;

export function Wizard() {
  const [step, setStep] = useState(0);
  const form = useForm<IntakeInput, unknown, Intake>({
    resolver: zodResolver(IntakeSchema),
    defaultValues: buildDefaultValues(),
    mode: "onChange",
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await generateAndDownload(data);
      toast.success("DSA generated", {
        action: {
          label: "Generate another",
          onClick: () => {
            form.reset(buildDefaultValues());
            setStep(0);
          },
        },
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate the DSA",
      );
    }
  });

  const stepMeta = STEP_META[step];

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        <Stepper current={step} />
        <Card className="border-border/80 shadow-sm">
          <CardContent className="space-y-6 p-6">
            <div className="space-y-1 border-l-2 border-accent pl-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Step {step + 1} of {LAST_STEP + 1}
              </p>
              <h2 className="text-lg font-semibold tracking-tight">
                {stepMeta.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {stepMeta.description}
              </p>
            </div>
            {step === 0 && <Step1Jurisdiction />}
            {step === 1 && <Step2Counterparty />}
            {step === 2 && <Step3Scope />}
            {step === LAST_STEP && <Step4McrReview />}
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </Button>
          {step < LAST_STEP ? (
            <Button
              type="button"
              onClick={async () => {
                const fields = STEP_FIELDS[step];
                const valid = await form.trigger(fields);
                if (valid) setStep((s) => Math.min(LAST_STEP, s + 1));
              }}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!form.formState.isValid || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Generating…" : "Generate DSA"}
            </Button>
          )}
        </div>
      </div>
    </FormProvider>
  );
}
