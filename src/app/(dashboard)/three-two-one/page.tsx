import { Suspense } from "react";
import Link from "next/link";
import { Plus, ListChecks } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThreeTwoOneCard } from "@/components/features/three-two-one-card";
import { ThemeFilter } from "@/components/features/theme-filter";
import { createClient } from "@/lib/supabase/server";
import type { Theme } from "@/types/database";

interface ThreeTwoOnePageProps {
  searchParams: Promise<{ themes?: string }>;
}

async function ThreeTwoOneList({ themeSlugs }: { themeSlugs: string[] }) {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("three_two_one")
    .select(`
      *,
      profiles:author_id (full_name),
      teams:team_id (name),
      three_two_one_themes (
        themes (id, name, slug)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching 3-2-1s:", error);
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load 3-2-1 entries</p>
      </div>
    );
  }

  // Transform and filter items
  let transformedItems = (items ?? []).map((item) => ({
    ...item,
    themes: (item.three_two_one_themes as Array<{ themes: Theme }> | null)?.map(
      (tt) => tt.themes
    ) ?? [],
  }));

  // Filter by theme if specified
  if (themeSlugs.length > 0) {
    transformedItems = transformedItems.filter((item) =>
      item.themes.some((theme) => themeSlugs.includes(theme.slug))
    );
  }

  if (transformedItems.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ListChecks className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">
          {themeSlugs.length > 0 ? "No matching entries" : "No 3-2-1 entries yet"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {themeSlugs.length > 0
            ? "Try adjusting your theme filters"
            : "Be the first to share your learnings!"}
        </p>
        {themeSlugs.length === 0 && (
          <Button asChild className="mt-4">
            <Link href="/three-two-one/new">
              <Plus className="mr-2 h-4 w-4" />
              Create 3-2-1
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {transformedItems.map((item) => (
        <ThreeTwoOneCard
          key={item.id}
          item={item}
          authorName={(item.profiles as { full_name: string } | null)?.full_name ?? undefined}
          teamName={(item.teams as { name: string } | null)?.name ?? undefined}
          themes={item.themes}
        />
      ))}
    </div>
  );
}

function ThreeTwoOneListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="h-48" />
      ))}
    </div>
  );
}

async function ThemeFilterWrapper() {
  const supabase = await createClient();
  const { data: themes } = await supabase
    .from("themes")
    .select("*")
    .order("name");

  return <ThemeFilter themes={themes ?? []} />;
}

export default async function ThreeTwoOnePage({ searchParams }: ThreeTwoOnePageProps) {
  const params = await searchParams;
  const themeSlugs = params.themes?.split(",").filter(Boolean) ?? [];

  return (
    <>
      <Header title="3-2-1 Model" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground">
                3 learnings, 2 changes, 1 question
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/three-two-one/new">
                <Plus className="mr-2 h-4 w-4" />
                New 3-2-1
              </Link>
            </Button>
          </div>

          <Suspense fallback={<Skeleton className="h-8 w-48" />}>
            <ThemeFilterWrapper />
          </Suspense>

          <Suspense fallback={<ThreeTwoOneListSkeleton />}>
            <ThreeTwoOneList themeSlugs={themeSlugs} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
