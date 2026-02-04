import { Suspense } from "react";
import Link from "next/link";
import { Plus, Presentation } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TakeoverCard } from "@/components/features/takeover-card";
import { ThemeFilter } from "@/components/features/theme-filter";
import { createClient } from "@/lib/supabase/server";
import type { Theme } from "@/types/database";

interface TakeoversPageProps {
  searchParams: Promise<{ themes?: string }>;
}

async function TakeoversList({ themeSlugs }: { themeSlugs: string[] }) {
  const supabase = await createClient();

  // Use RPC for efficient database-side filtering
  const { data: rpcData, error } = await supabase.rpc("get_takeovers_by_themes", {
    theme_slugs: themeSlugs.length > 0 ? themeSlugs : null,
  });

  if (error) {
    console.error("Error fetching takeovers:", error);
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load takeovers</p>
      </div>
    );
  }

  // Transform RPC results
  const transformedTakeovers = (rpcData ?? []).map((takeover) => ({
    id: takeover.id,
    meeting_date: takeover.meeting_date,
    top_learnings: takeover.top_learnings,
    visibility: takeover.visibility as "org" | "team",
    team_id: takeover.team_id,
    presenter_id: takeover.presenter_id,
    created_at: takeover.created_at,
    teams: takeover.team_name ? { name: takeover.team_name } : null,
    themes: (takeover.theme_data as Theme[]) ?? [],
  }));

  if (transformedTakeovers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Presentation className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">
          {themeSlugs.length > 0 ? "No matching takeovers" : "No takeovers scheduled"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {themeSlugs.length > 0
            ? "Try adjusting your theme filters"
            : "Plan your first 10-minute takeover!"}
        </p>
        {themeSlugs.length === 0 && (
          <Button asChild className="mt-4">
            <Link href="/takeovers/new">
              <Plus className="mr-2 h-4 w-4" />
              Schedule Takeover
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {transformedTakeovers.map((takeover) => (
        <TakeoverCard
          key={takeover.id}
          takeover={takeover}
          teamName={takeover.teams?.name ?? undefined}
          themes={takeover.themes}
        />
      ))}
    </div>
  );
}

function TakeoversListSkeleton() {
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

export default async function TakeoversPage({ searchParams }: TakeoversPageProps) {
  const params = await searchParams;
  const themeSlugs = params.themes?.split(",").filter(Boolean) ?? [];

  return (
    <>
      <Header title="10-Minute Takeovers" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground">
                Meeting agenda items to share your learnings with the team
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/takeovers/new">
                <Plus className="mr-2 h-4 w-4" />
                Schedule Takeover
              </Link>
            </Button>
          </div>

          <Suspense fallback={<Skeleton className="h-8 w-48" />}>
            <ThemeFilterWrapper />
          </Suspense>

          <Suspense fallback={<TakeoversListSkeleton />}>
            <TakeoversList themeSlugs={themeSlugs} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
