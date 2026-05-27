"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ScotlandPathwayHelp() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            aria-label="Why are only Local Authority and Charity Partner enabled for Scotland?"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 text-sm">
          <p className="font-medium">Scotland: state schools vs charities</p>
          <p className="mt-2 text-muted-foreground">
            Scottish state schools have no separate legal personality from their
            local authority. Under the Education (Scotland) Act 1980 the council
            is the &ldquo;education authority&rdquo; that controls pupil data — so
            for state-school partnerships the DSA is with the council, not the
            school. Charity partners are separate legal persons and sign their
            own DSA directly.
          </p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="mt-3 text-primary underline-offset-4 hover:underline"
          >
            See the full state-school pathway →
          </button>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Scotland LA-owned school DSA pathway</DialogTitle>
          </DialogHeader>
          {dialogOpen && (
            <iframe
              src="/dsa-builder/scotland-pathway.html"
              title="Scotland LA-owned school DSA pathway"
              className="h-[70vh] w-full rounded border border-border"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
