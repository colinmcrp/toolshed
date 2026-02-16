import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/partnerships/queries";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const profile = await getUserProfile();

  return (
    <SidebarProvider>
      <AppSidebar user={user} userRole={profile?.role ?? "staff"} />
      <SidebarInset>{children}</SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
