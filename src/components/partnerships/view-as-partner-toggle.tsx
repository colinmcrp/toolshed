"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewAsPartnerToggleProps {
  onToggle: (viewAsPartner: boolean) => void;
  isPartnerView: boolean;
}

export function ViewAsPartnerToggle({
  onToggle,
  isPartnerView,
}: ViewAsPartnerToggleProps) {
  return (
    <Button
      variant={isPartnerView ? "default" : "outline"}
      size="sm"
      onClick={() => onToggle(!isPartnerView)}
      className="gap-2"
    >
      {isPartnerView ? <EyeOff size={14} /> : <Eye size={14} />}
      {isPartnerView ? "Back to Staff View" : "View as Partner"}
    </Button>
  );
}
