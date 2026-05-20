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

type IntakeInput = z.input<typeof IntakeSchema>;

const DEFAULT_VALUES: IntakeInput = {
  jurisdiction: "Scotland",
  counterpartyType: "LocalAuthority",
  includeCriminalRecord: true,
  includeGroupwork: undefined,
  includeFundraising: true,
  counterparty: {
    legalName: "",
    shortName: "",
    address: "",
    signatoryName: "",
    signatoryPosition: "",
    signatoryDate: "",
    signatoryPlace: "",
    witnessName: "",
    witnessPosition: "",
    witnessDate: "",
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
    signatoryName: "",
    signatoryPosition: "Head of Schools",
    signatoryDate: "",
    witnessName: "",
    witnessPosition: "Programme Manager",
    witnessDate: "",
  },
};

const STEP_FIELDS: Record<number, Path<IntakeInput>[]> = {
  0: ["jurisdiction", "counterpartyType"],
  1: ["counterparty"],
  2: ["includeCriminalRecord", "includeGroupwork", "includeFundraising"],
  3: ["mcr"],
};

export function Wizard() {
  const [step, setStep] = useState(0);
  const form = useForm<IntakeInput, unknown, Intake>({
    resolver: zodResolver(IntakeSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await generateAndDownload(data);
      toast.success("DSA generated", {
        action: {
          label: "Generate another",
          onClick: () => {
            form.reset(DEFAULT_VALUES as IntakeInput);
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

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        <Stepper current={step} />
        <Card>
          <CardContent className="p-6">
            {step === 0 && <Step1Jurisdiction />}
            {step === 1 && <Step2Counterparty />}
            {step >= 2 && (
              <p className="text-sm text-muted-foreground">
                Step {step + 1} placeholder — to be implemented.
              </p>
            )}
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
          {step < 3 ? (
            <Button
              type="button"
              onClick={async () => {
                const fields = STEP_FIELDS[step];
                const valid = await form.trigger(fields);
                if (valid) setStep((s) => Math.min(3, s + 1));
              }}
            >
              Next
            </Button>
          ) : (
            <Button type="button" onClick={onSubmit}>
              Generate DSA
            </Button>
          )}
        </div>
      </div>
    </FormProvider>
  );
}
