import Link from "next/link";
import { BookOpen, RefreshCw, HelpCircle, Calendar, Globe, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ThreeTwoOne, Theme } from "@/types/database";

interface ThreeTwoOneCardProps {
  item: ThreeTwoOne;
  authorName?: string;
  teamName?: string;
  themes?: Theme[];
}

export function ThreeTwoOneCard({ item, authorName, teamName, themes = [] }: ThreeTwoOneCardProps) {
  return (
    <Link href={`/three-two-one/${item.id}`}>
      <Card className="h-full hover:border-mcr-orange hover:bg-muted/30 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-tight">
              {item.training_title}
            </CardTitle>
            {item.visibility === "team" ? (
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
            {new Date(item.created_at).toLocaleDateString()}
            {authorName && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <span>{authorName}</span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {item.learnings?.[0] && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {item.learnings[0]}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Badge className="text-xs font-normal bg-mcr-light-blue/15 text-mcr-light-blue">
              <BookOpen className="mr-1 h-3 w-3" />
              3 Learnings
            </Badge>
            <Badge className="text-xs font-normal bg-mcr-orange/15 text-mcr-orange">
              <RefreshCw className="mr-1 h-3 w-3" />
              2 Changes
            </Badge>
            {item.question && (
              <Badge className="text-xs font-normal bg-mcr-teal/15 text-mcr-teal">
                <HelpCircle className="mr-1 h-3 w-3" />
                1 Question
              </Badge>
            )}
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
