"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Jurisdiction", hint: "Where & with whom" },
  { label: "Counterparty", hint: "Who they are" },
  { label: "Scope", hint: "What's included" },
  { label: "Sign-off", hint: "MCR & review" },
] as const;

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="grid grid-cols-4 gap-1 sm:gap-2">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.label} className="space-y-2">
            <div
              className={cn(
                "h-[3px] w-full rounded-full transition-colors",
                done && "bg-primary",
                active && "bg-accent",
                !done && !active && "bg-border",
              )}
            />
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
                  active &&
                    "bg-primary text-primary-foreground ring-2 ring-accent ring-offset-2 ring-offset-background",
                  done && "bg-primary/15 text-primary",
                  !active && !done && "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-xs font-medium",
                    active && "text-foreground",
                    !active && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </p>
                <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
                  {step.hint}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
