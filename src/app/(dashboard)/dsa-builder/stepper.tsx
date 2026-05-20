"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  "Jurisdiction",
  "Counterparty",
  "Scope",
  "MCR & review",
] as const;

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs sm:text-sm">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2",
              i < STEPS.length - 1 && "flex-1",
            )}
          >
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium",
                active && "border-primary bg-primary text-primary-foreground",
                done && "border-primary bg-primary/10 text-primary",
                !active && !done && "border-border text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "whitespace-nowrap",
                active ? "font-medium" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
