import { Suspense } from "react";
import Link from "next/link";
import { Plus, Presentation } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TakeoverCard } from "@/components/features/takeover-card";
import { createClient } from "@/lib/supabase/server";

async function TakeoversList() {
  const supabase = await createClient();

  const { data: takeovers, error } = await supabase
    .from("takeovers")
    .select(`
      *,
      profiles:presenter_id (full_name)
    `)
    .order("meeting_date", { ascending: false });

  if (error) {
    console.error("Error fetching takeovers:", error);
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load takeovers</p>
      </div>
    );
  }

  if (!takeovers || takeovers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Presentation className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No takeovers scheduled</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan your first 10-minute takeover!
        </p>
        <Button asChild className="mt-4">
          <Link href="/takeovers/new">
            <Plus className="mr-2 h-4 w-4" />
            Schedule Takeover
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {takeovers.map((takeover) => (
        <TakeoverCard
          key={takeover.id}
          takeover={takeover}
          presenterName={(takeover.profiles as { full_name: string } | null)?.full_name ?? undefined}
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

export default function TakeoversPage() {
  return (
    <>
      <Header title="10-Minute Takeovers" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">
                Meeting agenda items to share your learnings with the team
              </p>
            </div>
            <Button asChild>
              <Link href="/takeovers/new">
                <Plus className="mr-2 h-4 w-4" />
                Schedule Takeover
              </Link>
            </Button>
          </div>

          <Suspense fallback={<TakeoversListSkeleton />}>
            <TakeoversList />
          </Suspense>
        </div>
      </main>
    </>
  );
}
