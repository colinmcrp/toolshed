import { notFound } from "next/navigation";
import Link from "next/link";
import { Presentation, Calendar, ArrowLeft, Pencil, CheckCircle } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient, getUser } from "@/lib/supabase/server";
import { DeleteTakeoverButton } from "./delete-button";

interface TakeoverPageProps {
  params: Promise<{ id: string }>;
}

export default async function TakeoverPage({ params }: TakeoverPageProps) {
  const { id } = await params;
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  const { data: takeover, error } = await supabase
    .from("takeovers")
    .select(`
      *,
      profiles:presenter_id (full_name)
    `)
    .eq("id", id)
    .single();

  if (error || !takeover) {
    notFound();
  }

  const isOwner = user?.id === takeover.presenter_id;
  const presenterName = (takeover.profiles as { full_name: string } | null)?.full_name ?? "Unknown";
  const presenterInitials = presenterName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const meetingDate = new Date(takeover.meeting_date);
  const isUpcoming = meetingDate >= new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <>
      <Header title="Takeover" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/takeovers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Takeovers
              </Link>
            </Button>
            {isOwner && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/takeovers/${id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <DeleteTakeoverButton takeoverId={id} />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mcr-teal/10">
                <Presentation className="h-6 w-6 text-mcr-teal" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  10-Minute Takeover
                  {isUpcoming && (
                    <Badge variant="secondary" className="bg-mcr-teal/10 text-mcr-teal">
                      Upcoming
                    </Badge>
                  )}
                </h1>
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-4 w-4" />
                  {meetingDate.toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {presenterInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{presenterName}</span>
                <span className="text-xs text-muted-foreground">Presenter</span>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Learnings to Share</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {takeover.top_learnings?.map((learning, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mcr-teal/10">
                    <CheckCircle className="h-4 w-4 text-mcr-teal" />
                  </div>
                  <p className="text-sm">{learning}</p>
                </div>
              ))}
              {(!takeover.top_learnings || takeover.top_learnings.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No learnings added yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
