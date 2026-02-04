import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ThreeTwoOneForm } from "@/components/features/three-two-one-form";
import { createClient, getUser } from "@/lib/supabase/server";

interface EditThreeTwoOnePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditThreeTwoOnePage({ params }: EditThreeTwoOnePageProps) {
  const { id } = await params;
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  if (!user) {
    redirect("/login");
  }

  const [itemResult, profileResult] = await Promise.all([
    supabase.from("three_two_one").select("*").eq("id", id).single(),
    supabase
      .from("profiles")
      .select("team_id, teams:team_id(id, name, created_at)")
      .eq("id", user.id)
      .single(),
  ]);

  const { data: item, error } = itemResult;
  const userTeam = profileResult.data?.teams ?? null;

  if (error || !item) {
    notFound();
  }

  // Only allow the owner to edit
  if (item.author_id !== user.id) {
    redirect(`/three-two-one/${id}`);
  }

  return (
    <>
      <Header title="Edit 3-2-1" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={`/three-two-one/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to 3-2-1
              </Link>
            </Button>
            <p className="text-muted-foreground">
              Update your 3-2-1 entry.
            </p>
          </div>
          <ThreeTwoOneForm threeTwoOne={item} userId={user.id} userTeam={userTeam} />
        </div>
      </main>
    </>
  );
}
