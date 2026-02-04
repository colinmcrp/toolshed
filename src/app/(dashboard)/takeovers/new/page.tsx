import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { TakeoverForm } from "@/components/features/takeover-form";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function NewTakeoverPage() {
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
      <Header title="Schedule Takeover" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <p className="text-muted-foreground">
              Plan your 10-minute takeover to share learnings at a team meeting.
            </p>
          </div>
          <TakeoverForm userId={user.id} userTeam={userTeam} />
        </div>
      </main>
    </>
  );
}
