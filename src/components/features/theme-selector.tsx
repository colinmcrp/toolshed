"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import type { Theme } from "@/types/database";
import { cn } from "@/lib/utils";

interface ThemeSelectorProps {
  selectedThemeIds: string[];
  onSelectionChange: (themeIds: string[]) => void;
  disabled?: boolean;
}

export function ThemeSelector({
  selectedThemeIds,
  onSelectionChange,
  disabled,
}: ThemeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch themes on mount
  useEffect(() => {
    async function fetchThemes() {
      const supabase = createClient();
      const { data } = await supabase
        .from("themes")
        .select("*")
        .order("name");
      if (data) setThemes(data);
      setIsLoading(false);
    }
    fetchThemes();
  }, []);

  const selectedThemes = themes.filter((t) => selectedThemeIds.includes(t.id));
  const filteredThemes = themes.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const canCreate =
    search.length > 0 &&
    !themes.some((t) => t.name.toLowerCase() === search.toLowerCase());

  async function handleCreateTheme() {
    if (!search.trim()) return;
    setIsCreating(true);

    const supabase = createClient();
    const slug = search
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const { data, error } = await supabase
      .from("themes")
      .insert({ name: search.trim(), slug })
      .select()
      .single();

    if (data && !error) {
      setThemes((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
      );
      onSelectionChange([...selectedThemeIds, data.id]);
      setSearch("");
    }
    setIsCreating(false);
  }

  function toggleTheme(themeId: string) {
    if (selectedThemeIds.includes(themeId)) {
      onSelectionChange(selectedThemeIds.filter((id) => id !== themeId));
    } else {
      onSelectionChange([...selectedThemeIds, themeId]);
    }
  }

  function removeTheme(themeId: string) {
    onSelectionChange(selectedThemeIds.filter((id) => id !== themeId));
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || isLoading}
          >
            {isLoading
              ? "Loading themes..."
              : selectedThemes.length === 0
                ? "Select themes..."
                : `${selectedThemes.length} theme${selectedThemes.length > 1 ? "s" : ""} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or create theme..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {filteredThemes.length === 0 && !canCreate && (
                <CommandEmpty>No themes found.</CommandEmpty>
              )}
              {filteredThemes.length === 0 && canCreate && (
                <CommandEmpty className="py-0">
                  <button
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-accent cursor-pointer"
                    onClick={handleCreateTheme}
                    disabled={isCreating}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    Create &quot;{search}&quot;
                  </button>
                </CommandEmpty>
              )}
              {filteredThemes.length > 0 && (
                <CommandGroup>
                  {filteredThemes.map((theme) => (
                    <CommandItem
                      key={theme.id}
                      value={theme.id}
                      onSelect={() => toggleTheme(theme.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedThemeIds.includes(theme.id)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {theme.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {canCreate && filteredThemes.length > 0 && (
                <CommandGroup>
                  <CommandItem onSelect={handleCreateTheme} disabled={isCreating}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create &quot;{search}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedThemes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedThemes.map((theme) => (
            <Badge key={theme.id} variant="secondary" className="gap-1 pr-1">
              {theme.name}
              <button
                type="button"
                onClick={() => removeTheme(theme.id)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {theme.name}</span>
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
