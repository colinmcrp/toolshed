"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Check, ChevronsUpDown, X, Filter } from "lucide-react";
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
import type { Theme } from "@/types/database";
import { cn } from "@/lib/utils";

interface ThemeFilterProps {
  themes: Theme[];
}

export function ThemeFilter({ themes }: ThemeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedSlugs = searchParams.get("themes")?.split(",").filter(Boolean) ?? [];
  const selectedThemes = themes.filter((t) => selectedSlugs.includes(t.slug));

  const updateFilter = useCallback(
    (slugs: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (slugs.length > 0) {
        params.set("themes", slugs.join(","));
      } else {
        params.delete("themes");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  function toggleTheme(slug: string) {
    if (selectedSlugs.includes(slug)) {
      updateFilter(selectedSlugs.filter((s) => s !== slug));
    } else {
      updateFilter([...selectedSlugs, slug]);
    }
  }

  function removeTheme(slug: string) {
    updateFilter(selectedSlugs.filter((s) => s !== slug));
  }

  function clearAll() {
    updateFilter([]);
  }

  if (themes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Filter className="mr-2 h-4 w-4" />
            Filter by theme
            {selectedThemes.length > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5">
                {selectedThemes.length}
              </Badge>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search themes..." />
            <CommandList>
              <CommandEmpty>No themes found.</CommandEmpty>
              <CommandGroup>
                {themes.map((theme) => (
                  <CommandItem
                    key={theme.id}
                    value={theme.slug}
                    onSelect={() => toggleTheme(theme.slug)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedSlugs.includes(theme.slug)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {theme.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedThemes.length > 0 && (
        <>
          {selectedThemes.map((theme) => (
            <Badge key={theme.id} variant="secondary" className="gap-1 pr-1">
              {theme.name}
              <button
                type="button"
                onClick={() => removeTheme(theme.slug)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {theme.name} filter</span>
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={clearAll}
          >
            Clear all
          </Button>
        </>
      )}
    </div>
  );
}
