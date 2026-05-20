"use client";

import { z } from "zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IntakeSchema, type Intake } from "@/lib/dsa-builder/schema";
import { generateAndDownload } from "@/lib/dsa-builder/render";
import { Stepper } from "./stepper";

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
            <p className="text-sm text-muted-foreground">
              Step {step + 1} placeholder — to be implemented.
            </p>
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
            <Button type="button" onClick={() => setStep((s) => Math.min(3, s + 1))}>
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
