import Link from "next/link";
import { Presentation, Calendar, MessageSquare, Globe, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Takeover, Theme } from "@/types/database";

interface TakeoverCardProps {
  takeover: Takeover;
  presenterName?: string;
  teamName?: string;
  themes?: Theme[];
}

export function TakeoverCard({ takeover, presenterName, teamName, themes = [] }: TakeoverCardProps) {
  const learningsCount = takeover.top_learnings?.length ?? 0;
  const meetingDate = new Date(takeover.meeting_date);
  const isUpcoming = meetingDate >= new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <Link href={`/takeovers/${takeover.id}`}>
      <Card className="h-full hover:border-mcr-teal hover:bg-muted/30 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-tight flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mcr-teal/10">
                <Presentation className="h-4 w-4 text-mcr-teal" />
              </div>
              10-Minute Takeover
            </CardTitle>
            <div className="flex gap-1.5 shrink-0">
              {isUpcoming && (
                <Badge variant="secondary" className="bg-mcr-teal/10 text-mcr-teal">
                  Upcoming
                </Badge>
              )}
              {takeover.visibility === "team" ? (
                <Badge variant="outline" className="text-xs font-normal">
                  <Users className="mr-1 h-3 w-3" />
                  {teamName ?? "Team"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  <Globe className="mr-1 h-3 w-3" />
                  Org
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Calendar className="h-3 w-3" />
            {meetingDate.toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {presenterName && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <span>{presenterName}</span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {takeover.top_learnings?.[0] && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {takeover.top_learnings[0]}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Badge className="text-xs font-normal bg-mcr-teal/15 text-mcr-teal">
              <MessageSquare className="mr-1 h-3 w-3" />
              {learningsCount} learning{learningsCount !== 1 ? "s" : ""} to share
            </Badge>
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
