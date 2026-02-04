"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Mail, ListChecks, Presentation, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { createClient } from "@/lib/supabase/client";
import type { Theme } from "@/types/database";

interface SearchResult {
  id: string;
  type: "postcard" | "three_two_one" | "takeover";
  title: string;
  preview: string | null;
  themes: Theme[];
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetch themes on mount
  useEffect(() => {
    async function fetchThemes() {
      const supabase = createClient();
      const { data } = await supabase.from("themes").select("*").order("name");
      if (data) setThemes(data);
    }
    fetchThemes();
  }, []);

  // Search function using RPC for efficient database-side filtering
  const performSearch = useCallback(async () => {
    if (!search.trim() && selectedThemeIds.length === 0) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    try {
      // Use the global_search RPC function for efficient server-side search
      const { data, error } = await supabase.rpc("global_search", {
        search_term: search.trim(),
        theme_ids: selectedThemeIds.length > 0 ? selectedThemeIds : null,
      });

      if (error) {
        console.error("Search error:", error);
        setResults([]);
        return;
      }

      // Transform RPC results to SearchResult format
      const searchResults: SearchResult[] = (data ?? []).map((item) => ({
        id: item.id,
        type: item.type as "postcard" | "three_two_one" | "takeover",
        title: item.title,
        preview: item.preview,
        themes: (item.theme_data as Theme[]) ?? [],
      }));

      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedThemeIds]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [performSearch]);

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setSearch("");
    setSelectedThemeIds([]);

    switch (result.type) {
      case "postcard":
        router.push(`/postcards/${result.id}`);
        break;
      case "three_two_one":
        router.push(`/three-two-one/${result.id}`);
        break;
      case "takeover":
        router.push(`/takeovers/${result.id}`);
        break;
    }
  }

  function toggleTheme(themeId: string) {
    setSelectedThemeIds((prev) =>
      prev.includes(themeId)
        ? prev.filter((id) => id !== themeId)
        : [...prev, themeId]
    );
  }

  function getIcon(type: SearchResult["type"]) {
    switch (type) {
      case "postcard":
        return <Mail className="h-4 w-4 text-mcr-light-blue" />;
      case "three_two_one":
        return <ListChecks className="h-4 w-4 text-mcr-orange" />;
      case "takeover":
        return <Presentation className="h-4 w-4 text-mcr-teal" />;
    }
  }

  function getLabel(type: SearchResult["type"]) {
    switch (type) {
      case "postcard":
        return "Postcard";
      case "three_two_one":
        return "3-2-1";
      case "takeover":
        return "Takeover";
    }
  }

  const selectedThemes = themes.filter((t) => selectedThemeIds.includes(t.id));

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-md bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search everything...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search across all postcards, 3-2-1s, and takeovers"
      >
        <CommandInput
          placeholder="Search by title or content..."
          value={search}
          onValueChange={setSearch}
        />

        {/* Theme filters */}
        {themes.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3 py-2 border-b">
            <span className="text-xs text-muted-foreground mr-1 self-center">
              <Tag className="h-3 w-3 inline mr-1" />
              Filter:
            </span>
            {themes.slice(0, 6).map((theme) => (
              <Badge
                key={theme.id}
                variant={selectedThemeIds.includes(theme.id) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleTheme(theme.id)}
              >
                {theme.name}
              </Badge>
            ))}
            {selectedThemes.length > 0 && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground ml-1"
                onClick={() => setSelectedThemeIds([])}
              >
                Clear
              </button>
            )}
          </div>
        )}

        <CommandList>
          {isLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {!isLoading && results.length === 0 && (search || selectedThemeIds.length > 0) && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {!isLoading && results.length === 0 && !search && selectedThemeIds.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Start typing to search...
            </div>
          )}

          {/* Group results by type */}
          {!isLoading && results.filter((r) => r.type === "postcard").length > 0 && (
            <CommandGroup heading="Postcards">
              {results
                .filter((r) => r.type === "postcard")
                .map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result)}
                  >
                    {getIcon(result.type)}
                    <div className="ml-2 flex-1 overflow-hidden">
                      <div className="font-medium truncate">{result.title}</div>
                      {result.preview && (
                        <div className="text-xs text-muted-foreground truncate">
                          {result.preview}
                        </div>
                      )}
                    </div>
                    {result.themes.length > 0 && (
                      <div className="flex gap-1 ml-2">
                        {result.themes.slice(0, 2).map((theme) => (
                          <Badge
                            key={theme.id}
                            variant="secondary"
                            className="text-[10px] px-1"
                          >
                            {theme.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CommandItem>
                ))}
            </CommandGroup>
          )}

          {!isLoading && results.filter((r) => r.type === "three_two_one").length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="3-2-1 Reflections">
                {results
                  .filter((r) => r.type === "three_two_one")
                  .map((result) => (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      value={`${result.type}-${result.id}`}
                      onSelect={() => handleSelect(result)}
                    >
                      {getIcon(result.type)}
                      <div className="ml-2 flex-1 overflow-hidden">
                        <div className="font-medium truncate">{result.title}</div>
                        {result.preview && (
                          <div className="text-xs text-muted-foreground truncate">
                            {result.preview}
                          </div>
                        )}
                      </div>
                      {result.themes.length > 0 && (
                        <div className="flex gap-1 ml-2">
                          {result.themes.slice(0, 2).map((theme) => (
                            <Badge
                              key={theme.id}
                              variant="secondary"
                              className="text-[10px] px-1"
                            >
                              {theme.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          )}

          {!isLoading && results.filter((r) => r.type === "takeover").length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Takeovers">
                {results
                  .filter((r) => r.type === "takeover")
                  .map((result) => (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      value={`${result.type}-${result.id}`}
                      onSelect={() => handleSelect(result)}
                    >
                      {getIcon(result.type)}
                      <div className="ml-2 flex-1 overflow-hidden">
                        <div className="font-medium truncate">{result.title}</div>
                        {result.preview && (
                          <div className="text-xs text-muted-foreground truncate">
                            {result.preview}
                          </div>
                        )}
                      </div>
                      {result.themes.length > 0 && (
                        <div className="flex gap-1 ml-2">
                          {result.themes.slice(0, 2).map((theme) => (
                            <Badge
                              key={theme.id}
                              variant="secondary"
                              className="text-[10px] px-1"
                            >
                              {theme.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
