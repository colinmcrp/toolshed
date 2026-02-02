import { notFound } from "next/navigation";
import Link from "next/link";
import { BookOpen, RefreshCw, HelpCircle, Calendar, ArrowLeft, Pencil } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient, getUser } from "@/lib/supabase/server";
import { DeleteThreeTwoOneButton } from "./delete-button";

interface ThreeTwoOnePageProps {
  params: Promise<{ id: string }>;
}

export default async function ThreeTwoOnePage({ params }: ThreeTwoOnePageProps) {
  const { id } = await params;
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  const { data: item, error } = await supabase
    .from("three_two_one")
    .select(`
      *,
      profiles:author_id (full_name)
    `)
    .eq("id", id)
    .single();

  if (error || !item) {
    notFound();
  }

  const isOwner = user?.id === item.author_id;
  const authorName = (item.profiles as { full_name: string } | null)?.full_name ?? "Unknown";
  const authorInitials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Header title="3-2-1" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/three-two-one">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to 3-2-1s
              </Link>
            </Button>
            {isOwner && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/three-two-one/${id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <DeleteThreeTwoOneButton itemId={id} />
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {item.training_title}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{authorName}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(item.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* 3 Learnings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mcr-light-blue/10">
                  <BookOpen className="h-4 w-4 text-mcr-light-blue" />
                </div>
                <div>
                  <div>3 Things I Learned</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.learnings?.map((learning, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mcr-light-blue/10 text-xs font-medium text-mcr-light-blue">
                    {index + 1}
                  </div>
                  <p className="text-sm">{learning}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 2 Changes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mcr-orange/10">
                  <RefreshCw className="h-4 w-4 text-mcr-orange" />
                </div>
                <div>
                  <div>2 Things I&apos;ll Change</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.changes?.map((change, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mcr-orange/10 text-xs font-medium text-mcr-orange">
                    {index + 1}
                  </div>
                  <p className="text-sm">{change}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 1 Question */}
          {item.question && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mcr-teal/10">
                    <HelpCircle className="h-4 w-4 text-mcr-teal" />
                  </div>
                  <div>
                    <div>1 Question I Still Have</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{item.question}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
