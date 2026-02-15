import { Mail, Calendar } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getUser } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const user = await getUser();

  if (!user) {
    return null;
  }

  const fullName = user.user_metadata?.full_name ?? "User";
  const email = user.email ?? "";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : "Unknown";

  return (
    <>
      <Header title="Profile" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <Card>
            <CardContent className="flex flex-col sm:flex-row items-center gap-6 p-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold">{fullName}</h2>
                <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1 mt-1">
                  <Mail className="h-4 w-4" />
                  {email}
                </p>
                <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  Member since {createdAt}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
