import { Suspense } from "react";
import Link from "next/link";
import { Mail, ListChecks, Presentation, Calendar } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient, getUser } from "@/lib/supabase/server";

async function UserStats() {
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  if (!user) {
    return null;
  }

  const [postcardsResult, threeTwoOneResult, takeoversResult] = await Promise.all([
    supabase
      .from("postcards")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id),
    supabase
      .from("three_two_one")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id),
    supabase
      .from("takeovers")
      .select("id", { count: "exact", head: true })
      .eq("presenter_id", user.id),
  ]);

  const stats = [
    {
      label: "Postcards",
      count: postcardsResult.count ?? 0,
      icon: Mail,
      color: "text-mcr-light-blue",
      bgColor: "bg-mcr-light-blue/10",
      href: "/postcards",
    },
    {
      label: "3-2-1 Entries",
      count: threeTwoOneResult.count ?? 0,
      icon: ListChecks,
      color: "text-mcr-orange",
      bgColor: "bg-mcr-orange/10",
      href: "/three-two-one",
    },
    {
      label: "Takeovers",
      count: takeoversResult.count ?? 0,
      icon: Presentation,
      color: "text-mcr-green",
      bgColor: "bg-mcr-green/10",
      href: "/takeovers",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.count}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function UserStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

export default async function ProfilePage() {
  const user = await getUser();

  if (!user) {
    return null;
  }

  const fullName = user.user_metadata?.full_name ?? "User";
  const email = user.email ?? "";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : "Unknown";

  return (
    <>
      <Header title="Profile" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Profile Header */}
          <Card>
            <CardContent className="flex flex-col sm:flex-row items-center gap-6 p-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold">{fullName}</h2>
                <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1 mt-1">
                  <Mail className="h-4 w-4" />
                  {email}
                </p>
                <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  Member since {createdAt}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Your Contributions</h3>
            <Suspense fallback={<UserStatsSkeleton />}>
              <UserStats />
            </Suspense>
          </div>
        </div>
      </main>
    </>
  );
}
