import { Suspense } from "react";
import Link from "next/link";
import { Plus, Mail } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FlippingPostcard } from "@/components/features/flipping-postcard";
import { createClient, getUser } from "@/lib/supabase/server";

async function PostcardsList() {
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  const { data: postcards, error } = await supabase
    .from("postcards")
    .select(`
      *,
      profiles:author_id (full_name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching postcards:", error);
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load postcards</p>
      </div>
    );
  }

  if (!postcards || postcards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Mail className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No postcards yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Be the first to share a learning postcard!
        </p>
        <Button asChild className="mt-4">
          <Link href="/postcards/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Postcard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {postcards.map((postcard) => (
        <FlippingPostcard
          key={postcard.id}
          postcard={postcard}
          authorName={(postcard.profiles as { full_name: string } | null)?.full_name ?? undefined}
          isOwner={user?.id === postcard.author_id}
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

export default function PostcardsPage() {
  return (
    <>
      <Header title="Learning Postcards" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">
                4-section reflections from training and conferences. Click a postcard to flip it over!
              </p>
            </div>
            <Button asChild>
              <Link href="/postcards/new">
                <Plus className="mr-2 h-4 w-4" />
                New Postcard
              </Link>
            </Button>
          </div>

          <Suspense fallback={<PostcardsListSkeleton />}>
            <PostcardsList />
          </Suspense>
        </div>
      </main>
    </>
  );
}
