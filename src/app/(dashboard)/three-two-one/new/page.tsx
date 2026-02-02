import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ThreeTwoOneForm } from "@/components/features/three-two-one-form";
import { getUser } from "@/lib/supabase/server";

export default async function NewThreeTwoOnePage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

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
          <ThreeTwoOneForm userId={user.id} />
        </div>
      </main>
    </>
  );
}
