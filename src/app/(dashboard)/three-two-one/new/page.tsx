import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ThreeTwoOneForm } from "@/components/features/three-two-one-form";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function NewThreeTwoOnePage() {
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  if (!user) {
    redirect("/login");
  }

  // Fetch user's team
  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id, teams:team_id(id, name, created_at)")
    .eq("id", user.id)
    .single();

  const userTeam = profile?.teams ?? null;

  return (
    <>
      <Header title="New 3-2-1" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <p className="text-muted-foreground">
              Capture 3 learnings, 2 changes you&apos;ll make, and 1 question you still have.
            </p>
          </div>
          <ThreeTwoOneForm userId={user.id} userTeam={userTeam} />
        </div>
      </main>
    </>
  );
}
