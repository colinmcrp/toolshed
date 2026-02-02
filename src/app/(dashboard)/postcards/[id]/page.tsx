import { notFound } from "next/navigation";
import Link from "next/link";
import { Lightbulb, Sparkles, Target, Gem, Calendar, ArrowLeft, Pencil } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient, getUser } from "@/lib/supabase/server";
import { DeletePostcardButton } from "./delete-button";

interface PostcardPageProps {
  params: Promise<{ id: string }>;
}

const sections = [
  {
    key: "elevator_pitch" as const,
    label: "Elevator Pitch",
    description: "Summarized in 30 seconds or less",
    icon: Sparkles,
    color: "text-mcr-light-blue",
    bgColor: "bg-mcr-light-blue/10",
  },
  {
    key: "lightbulb_moment" as const,
    label: "Lightbulb Moment",
    description: "The biggest 'aha!' moment",
    icon: Lightbulb,
    color: "text-mcr-yellow",
    bgColor: "bg-mcr-yellow/10",
  },
  {
    key: "programme_impact" as const,
    label: "Programme Impact",
    description: "How this changes work with young people",
    icon: Target,
    color: "text-mcr-orange",
    bgColor: "bg-mcr-orange/10",
  },
  {
    key: "golden_nugget" as const,
    label: "Golden Nugget",
    description: "Key takeaway for colleagues",
    icon: Gem,
    color: "text-mcr-pink",
    bgColor: "bg-mcr-pink/10",
  },
];

export default async function PostcardPage({ params }: PostcardPageProps) {
  const { id } = await params;
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  const { data: postcard, error } = await supabase
    .from("postcards")
    .select(`
      *,
      profiles:author_id (full_name)
    `)
    .eq("id", id)
    .single();

  if (error || !postcard) {
    notFound();
  }

  const isOwner = user?.id === postcard.author_id;
  const authorName = (postcard.profiles as { full_name: string } | null)?.full_name ?? "Unknown";
  const authorInitials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Header title="Postcard" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/postcards">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Postcards
              </Link>
            </Button>
            {isOwner && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/postcards/${id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <DeletePostcardButton postcardId={id} />
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {postcard.training_title}
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
                  {new Date(postcard.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const content = postcard[section.key];

              if (!content) return null;

              return (
                <Card key={section.key}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${section.bgColor}`}>
                        <Icon className={`h-4 w-4 ${section.color}`} />
                      </div>
                      <div>
                        <div>{section.label}</div>
                        <div className="text-xs font-normal text-muted-foreground">
                          {section.description}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{content}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
