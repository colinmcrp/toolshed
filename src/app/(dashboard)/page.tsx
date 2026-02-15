import { Header } from "@/components/layout/header";
import { getUser } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await getUser();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "there";

  return (
    <>
      <Header title="Home" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back, {firstName}!
            </h2>
            <p className="text-muted-foreground mt-1">
              This is your MCR Pathways app. Let&apos;s build something great.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
