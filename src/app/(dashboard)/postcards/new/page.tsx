import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { PostcardForm } from "@/components/features/postcard-form";
import { getUser } from "@/lib/supabase/server";

export default async function NewPostcardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Header title="New Learning Postcard" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <p className="text-muted-foreground">
              Reflect on what you learned using the 4-section postcard format.
            </p>
          </div>
          <PostcardForm userId={user.id} />
        </div>
      </main>
    </>
  );
}
