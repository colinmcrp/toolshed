import { Header } from "@/components/layout/header";
import { getUser } from "@/lib/supabase/server";
import { Lock, Shield } from "lucide-react";
import Link from "next/link";

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
              Privacy-first tools that run entirely in your browser.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/secure-zip"
              className="group rounded-xl border bg-card p-6 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold group-hover:text-accent-foreground">
                  Secure ZIP Creator
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Create password-protected ZIP files with AES-256 encryption.
                Files never leave your device.
              </p>
              <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <Shield className="h-3 w-3" />
                100% Client-Side
              </div>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
