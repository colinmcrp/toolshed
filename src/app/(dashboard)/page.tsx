import { Suspense } from "react";
import Link from "next/link";
import { Mail, ListChecks, Presentation, Plus, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";

async function RecentActivity() {
  const supabase = await createClient();

  // Fetch recent items from all three content types in parallel
  const [postcardsResult, threeTwoOneResult, takeoversResult] = await Promise.all([
    supabase
      .from("postcards")
      .select("id, training_title, created_at, author_id")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("three_two_one")
      .select("id, training_title, created_at, author_id")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("takeovers")
      .select("id, meeting_date, created_at, presenter_id")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const postcards = postcardsResult.data ?? [];
  const threeTwoOnes = threeTwoOneResult.data ?? [];
  const takeovers = takeoversResult.data ?? [];

  const hasContent = postcards.length > 0 || threeTwoOnes.length > 0 || takeovers.length > 0;

  if (!hasContent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No learnings shared yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Be the first to share what you&apos;ve learned!
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <Button asChild size="sm">
              <Link href="/postcards/new">
                <Mail className="mr-2 h-4 w-4" />
                Create Postcard
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/three-two-one/new">
                <ListChecks className="mr-2 h-4 w-4" />
                Create 3-2-1
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {postcards.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Recent Postcards
            </h3>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/postcards">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3">
            {postcards.map((postcard) => (
              <Link key={postcard.id} href={`/postcards/${postcard.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <p className="font-medium">{postcard.training_title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(postcard.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {threeTwoOnes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Recent 3-2-1s
            </h3>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/three-two-one">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3">
            {threeTwoOnes.map((item) => (
              <Link key={item.id} href={`/three-two-one/${item.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <p className="font-medium">{item.training_title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {takeovers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Presentation className="h-4 w-4" />
              Recent Takeovers
            </h3>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/takeovers">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3">
            {takeovers.map((takeover) => (
              <Link key={takeover.id} href={`/takeovers/${takeover.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <p className="font-medium">
                      Meeting: {new Date(takeover.meeting_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(takeover.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecentActivitySkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="space-y-3">
            {[1, 2].map((j) => (
              <Skeleton key={j} className="h-16 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getUser();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "there";

  return (
    <>
      <Header title="Home" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back, {firstName}!
            </h2>
            <p className="text-muted-foreground mt-1">
              Share what you&apos;ve learned and discover insights from your colleagues.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/postcards/new">
              <Card className="hover:border-mcr-light-blue hover:bg-mcr-light-blue/5 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mcr-light-blue/10">
                    <Mail className="h-5 w-5 text-mcr-light-blue" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-base">Learning Postcard</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    4-section reflection from training
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link href="/three-two-one/new">
              <Card className="hover:border-mcr-orange hover:bg-mcr-orange/5 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mcr-orange/10">
                    <ListChecks className="h-5 w-5 text-mcr-orange" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-base">3-2-1 Model</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    3 learnings, 2 changes, 1 question
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link href="/takeovers/new">
              <Card className="hover:border-mcr-green hover:bg-mcr-green/5 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mcr-green/10">
                    <Presentation className="h-5 w-5 text-mcr-green" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-base">10-Minute Takeover</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    Meeting agenda item tracking
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Learnings</h3>
            <Suspense fallback={<RecentActivitySkeleton />}>
              <RecentActivity />
            </Suspense>
          </div>
        </div>
      </main>
    </>
  );
}
