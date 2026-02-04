import { Suspense } from "react";
import Link from "next/link";
import { Plus, Mail } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FlippingPostcard } from "@/components/features/flipping-postcard";
import { ThemeFilter } from "@/components/features/theme-filter";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Theme } from "@/types/database";

interface PostcardsPageProps {
  searchParams: Promise<{ themes?: string }>;
}

async function PostcardsList({ themeSlugs }: { themeSlugs: string[] }) {
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  // Use RPC for efficient database-side filtering
  const { data: rpcData, error } = await supabase.rpc("get_postcards_by_themes", {
    theme_slugs: themeSlugs.length > 0 ? themeSlugs : null,
  });

  if (error) {
    console.error("Error fetching postcards:", error);
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load postcards</p>
      </div>
    );
  }

  // Transform RPC results
  const transformedPostcards = (rpcData ?? []).map((postcard) => ({
    id: postcard.id,
    training_title: postcard.training_title,
    elevator_pitch: postcard.elevator_pitch,
    lightbulb_moment: postcard.lightbulb_moment,
    programme_impact: postcard.programme_impact,
    golden_nugget: postcard.golden_nugget,
    visibility: postcard.visibility as "org" | "team",
    team_id: postcard.team_id,
    author_id: postcard.author_id,
    created_at: postcard.created_at,
    teams: postcard.team_name ? { name: postcard.team_name } : null,
    themes: (postcard.theme_data as Theme[]) ?? [],
  }));

  if (transformedPostcards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Mail className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">
          {themeSlugs.length > 0 ? "No matching postcards" : "No postcards yet"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {themeSlugs.length > 0
            ? "Try adjusting your theme filters"
            : "Be the first to share a learning postcard!"}
        </p>
        {themeSlugs.length === 0 && (
          <Button asChild className="mt-4">
            <Link href="/postcards/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Postcard
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {transformedPostcards.map((postcard) => (
        <FlippingPostcard
          key={postcard.id}
          postcard={postcard}
          isOwner={user?.id === postcard.author_id}
          teamName={postcard.teams?.name ?? undefined}
          themes={postcard.themes}
        />
      ))}
    </div>
  );
}

function PostcardsListSkeleton() {
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

export default async function PostcardsPage({ searchParams }: PostcardsPageProps) {
  const params = await searchParams;
  const themeSlugs = params.themes?.split(",").filter(Boolean) ?? [];

  return (
    <>
      <Header title="Learning Postcards" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground">
                4-section reflections from training and conferences. Click a postcard to flip it over!
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/postcards/new">
                <Plus className="mr-2 h-4 w-4" />
                New Postcard
              </Link>
            </Button>
          </div>

          <Suspense fallback={<Skeleton className="h-8 w-48" />}>
            <ThemeFilterWrapper />
          </Suspense>

          <Suspense fallback={<PostcardsListSkeleton />}>
            <PostcardsList themeSlugs={themeSlugs} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
