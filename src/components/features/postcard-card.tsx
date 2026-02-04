import Link from "next/link";
import { Lightbulb, Sparkles, Target, Gem, Calendar, Globe, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Postcard, Theme } from "@/types/database";

interface PostcardCardProps {
  postcard: Postcard;
  authorName?: string;
  teamName?: string;
  themes?: Theme[];
}

const sectionConfig = [
  {
    key: "elevator_pitch" as const,
    label: "Elevator Pitch",
    icon: Sparkles,
    badgeClasses: "bg-mcr-light-blue/15 text-mcr-light-blue",
  },
  {
    key: "lightbulb_moment" as const,
    label: "Lightbulb",
    icon: Lightbulb,
    badgeClasses: "bg-mcr-yellow/20 text-amber-700",
    iconColor: "text-mcr-yellow",
  },
  {
    key: "programme_impact" as const,
    label: "Impact",
    icon: Target,
    badgeClasses: "bg-mcr-orange/15 text-mcr-orange",
  },
  {
    key: "golden_nugget" as const,
    label: "Golden Nugget",
    icon: Gem,
    badgeClasses: "bg-mcr-pink/15 text-mcr-pink",
  },
];

export function PostcardCard({ postcard, authorName, teamName, themes = [] }: PostcardCardProps) {
  const filledSections = sectionConfig.filter(
    (section) => postcard[section.key]
  );

  return (
    <Link href={`/postcards/${postcard.id}`}>
      <Card className="h-full hover:border-mcr-light-blue hover:bg-muted/30 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-tight">
              {postcard.training_title}
            </CardTitle>
            {postcard.visibility === "team" ? (
              <Badge variant="outline" className="shrink-0 text-xs font-normal">
                <Users className="mr-1 h-3 w-3" />
                {teamName ?? "Team"}
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 text-xs font-normal text-muted-foreground">
                <Globe className="mr-1 h-3 w-3" />
                Org
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(postcard.created_at).toLocaleDateString()}
            {authorName && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <span>{authorName}</span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {postcard.elevator_pitch && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {postcard.elevator_pitch}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {filledSections.map((section) => {
              const Icon = section.icon;
              return (
                <Badge
                  key={section.key}
                  className={`text-xs font-normal ${section.badgeClasses}`}
                >
                  <Icon className={`mr-1 h-3 w-3 ${section.iconColor ?? ""}`} />
                  {section.label}
                </Badge>
              );
            })}
          </div>
          {themes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t">
              {themes.map((theme) => (
                <Badge
                  key={theme.id}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {theme.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
