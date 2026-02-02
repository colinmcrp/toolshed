import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { TakeoverForm } from "@/components/features/takeover-form";
import { createClient, getUser } from "@/lib/supabase/server";

interface EditTakeoverPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTakeoverPage({ params }: EditTakeoverPageProps) {
  const { id } = await params;
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  if (!user) {
    redirect("/login");
  }

  const { data: takeover, error } = await supabase
    .from("takeovers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !takeover) {
    notFound();
  }

  // Only allow the owner to edit
  if (takeover.presenter_id !== user.id) {
    redirect(`/takeovers/${id}`);
  }

  return (
    <>
      <Header title="Edit Takeover" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={`/takeovers/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Takeover
              </Link>
            </Button>
            <p className="text-muted-foreground">
              Update your scheduled takeover.
            </p>
          </div>
          <TakeoverForm takeover={takeover} userId={user.id} />
        </div>
      </main>
    </>
  );
}
