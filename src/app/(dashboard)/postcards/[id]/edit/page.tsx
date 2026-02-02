import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { PostcardForm } from "@/components/features/postcard-form";
import { createClient, getUser } from "@/lib/supabase/server";

interface EditPostcardPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostcardPage({ params }: EditPostcardPageProps) {
  const { id } = await params;
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  if (!user) {
    redirect("/login");
  }

  const { data: postcard, error } = await supabase
    .from("postcards")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !postcard) {
    notFound();
  }

  // Only allow the owner to edit
  if (postcard.author_id !== user.id) {
    redirect(`/postcards/${id}`);
  }

  return (
    <>
      <Header title="Edit Postcard" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={`/postcards/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Postcard
              </Link>
            </Button>
            <p className="text-muted-foreground">
              Update your learning postcard.
            </p>
          </div>
          <PostcardForm postcard={postcard} userId={user.id} />
        </div>
      </main>
    </>
  );
}
