"use client";

import { Globe, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Team, Visibility } from "@/types/database";

interface VisibilitySelectorProps {
  value: Visibility;
  onChange: (value: Visibility, teamId: string | null) => void;
  userTeam: Team | null;
  disabled?: boolean;
}

export function VisibilitySelector({
  value,
  onChange,
  userTeam,
  disabled = false,
}: VisibilitySelectorProps) {
  const handleChange = (newValue: Visibility) => {
    if (disabled) return;
    if (newValue === "team" && userTeam) {
      onChange("team", userTeam.id);
    } else {
      onChange("org", null);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none">Share with</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleChange("org")}
          disabled={disabled}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all",
            value === "org"
              ? "border-mcr-blue bg-mcr-blue/10 text-mcr-blue"
              : "border-muted bg-background text-muted-foreground hover:border-mcr-blue/50 hover:bg-mcr-blue/5",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Globe className="h-4 w-4" />
          <span>Entire Org</span>
        </button>

        <button
          type="button"
          onClick={() => handleChange("team")}
          disabled={disabled || !userTeam}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all",
            value === "team"
              ? "border-mcr-blue bg-mcr-blue/10 text-mcr-blue"
              : "border-muted bg-background text-muted-foreground hover:border-mcr-blue/50 hover:bg-mcr-blue/5",
            (disabled || !userTeam) && "cursor-not-allowed opacity-50"
          )}
        >
          <Users className="h-4 w-4" />
          <span>{userTeam ? userTeam.name : "No Team"}</span>
        </button>
      </div>
      {!userTeam && (
        <p className="text-xs text-muted-foreground">
          You are not assigned to a team. Your posts will be visible to everyone.
        </p>
      )}
    </div>
  );
}
