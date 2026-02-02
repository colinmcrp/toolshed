import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { TakeoverForm } from "@/components/features/takeover-form";
import { getUser } from "@/lib/supabase/server";

export default async function NewTakeoverPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

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
          <TakeoverForm userId={user.id} />
        </div>
      </main>
    </>
  );
}
