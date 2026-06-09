import { Header } from "@/components/layout/header";
import { SessionKeepAlive } from "@/components/layout/session-keep-alive";
import { getUser } from "@/lib/supabase/server";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex min-h-svh flex-col">
      <SessionKeepAlive />
      <Header user={user} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
      <Toaster />
    </div>
  );
}
