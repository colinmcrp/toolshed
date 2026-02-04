"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Lightbulb, Sparkles, Target, Gem, Calendar, X, Pencil, RotateCcw, Globe, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Postcard, Theme } from "@/types/database";

interface FlippingPostcardProps {
  postcard: Postcard;
  authorName?: string;
  isOwner?: boolean;
  teamName?: string;
  themes?: Theme[];
}

const sectionConfig = [
  {
    key: "elevator_pitch" as const,
    label: "Elevator Pitch",
    description: "In 30 seconds or less",
    icon: Sparkles,
    color: "text-mcr-light-blue",
    bgColor: "bg-mcr-light-blue/20",
    badgeClasses: "bg-mcr-light-blue/15 text-mcr-light-blue",
  },
  {
    key: "lightbulb_moment" as const,
    label: "Lightbulb Moment",
    description: "The biggest 'aha!'",
    icon: Lightbulb,
    color: "text-mcr-yellow",
    bgColor: "bg-mcr-yellow/20",
    badgeClasses: "bg-mcr-yellow/20 text-amber-700",
    iconColor: "text-mcr-yellow",
  },
  {
    key: "programme_impact" as const,
    label: "Programme Impact",
    description: "How this changes my work",
    icon: Target,
    color: "text-mcr-orange",
    bgColor: "bg-mcr-orange/20",
    badgeClasses: "bg-mcr-orange/15 text-mcr-orange",
  },
  {
    key: "golden_nugget" as const,
    label: "Golden Nugget",
    description: "Key takeaway",
    icon: Gem,
    color: "text-mcr-pink",
    bgColor: "bg-mcr-pink/20",
    badgeClasses: "bg-mcr-pink/15 text-mcr-pink",
  },
];

export function FlippingPostcard({ postcard, authorName, isOwner, teamName, themes = [] }: FlippingPostcardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const filledSections = sectionConfig.filter((section) => postcard[section.key]);

  const authorInitials = authorName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "??";

  const handleOpen = useCallback(() => {
    if (cardRef.current) {
      setOriginRect(cardRef.current.getBoundingClientRect());
    }
    setIsOpen(true);
    setIsClosing(false);
    // Delay the flip to allow the modal to animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsFlipped(true);
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsFlipped(false);
    // Wait for flip animation before closing modal
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 600);
  }, []);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isClosing) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isClosing, handleClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Calculate the transform to animate from/to the original card position
  const getModalTransform = () => {
    if (!originRect || isFlipped) return {};

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Modal dimensions (max-w-4xl = 896px, aspect based on content)
    const modalWidth = Math.min(896, viewportWidth - 32);
    const modalHeight = Math.min(500, viewportHeight - 64);

    // Center of viewport
    const viewportCenterX = viewportWidth / 2;
    const viewportCenterY = viewportHeight / 2;

    // Center of original card
    const cardCenterX = originRect.left + originRect.width / 2;
    const cardCenterY = originRect.top + originRect.height / 2;

    // Scale factor
    const scaleX = originRect.width / modalWidth;
    const scaleY = originRect.height / modalHeight;
    const scale = Math.max(scaleX, scaleY);

    // Translation to card position
    const translateX = cardCenterX - viewportCenterX;
    const translateY = cardCenterY - viewportCenterY;

    return {
      transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
    };
  };

  const modal = isOpen && mounted ? createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500",
          isFlipped ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Card Container */}
      <div
        className="absolute inset-0 flex items-center justify-center p-4 md:p-8 pointer-events-none"
        style={{ perspective: "2000px" }}
      >
        <div
          className={cn(
            "relative w-full max-w-4xl pointer-events-auto",
            "[transform-style:preserve-3d]",
            "transition-all duration-700 ease-out"
          )}
          style={{
            transform: isFlipped
              ? "rotateY(180deg)"
              : `rotateY(0deg)`,
            ...((!isFlipped && originRect) ? getModalTransform() : {}),
          }}
        >
          {/* FRONT SIDE - Card Preview (shown briefly before flip) */}
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <Card className="h-full bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg leading-tight">
                  {postcard.training_title}
                </CardTitle>
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
            </Card>
          </div>

          {/* BACK SIDE - Postcard Details */}
          <div
            className="relative min-h-[500px] md:min-h-[450px] [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <div className="relative h-full w-full rounded-xl overflow-hidden shadow-2xl">
              {/* Paper texture background */}
              <div
                className="absolute inset-0 bg-mcr-ivory"
                style={{
                  backgroundImage: `
                    radial-gradient(ellipse at 20% 30%, rgba(255,250,235,0.9) 0%, transparent 50%),
                    radial-gradient(ellipse at 80% 70%, rgba(253,249,234,0.8) 0%, transparent 50%),
                    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")
                  `,
                  backgroundBlendMode: "overlay",
                }}
              />

              {/* Worn edges effect */}
              <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(139,119,101,0.15)]" />

              {/* Content */}
              <div className="relative h-full flex flex-col md:flex-row">
                {/* Left side - Message content */}
                <div className="flex-1 p-5 md:p-6 overflow-y-auto border-b md:border-b-0 md:border-r-2 border-dashed border-mcr-dark-blue/20 max-h-[60vh] md:max-h-none">
                  <div className="space-y-5">
                    {sectionConfig.map((section) => {
                      const Icon = section.icon;
                      const content = postcard[section.key];
                      if (!content) return null;

                      return (
                        <div key={section.key} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", section.bgColor)}>
                              <Icon className={cn("h-4 w-4", section.color)} />
                            </div>
                            <span className="text-xs font-semibold text-mcr-dark-blue uppercase tracking-wide">
                              {section.label}
                            </span>
                          </div>
                          <p className="text-sm text-mcr-dark-blue/90 whitespace-pre-wrap pl-9 leading-relaxed">
                            {content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right side - Address/stamp area */}
                <div className="w-full md:w-[38%] p-5 md:p-6 flex flex-col">
                  {/* Stamp */}
                  <div className="flex justify-end mb-4">
                    <div className="relative">
                      <div className="w-20 h-24 bg-white border-2 border-mcr-dark-blue/30 rounded-sm flex flex-col items-center justify-center shadow-sm"
                        style={{
                          backgroundImage: `
                            repeating-linear-gradient(
                              0deg,
                              transparent,
                              transparent 3px,
                              rgba(33,51,80,0.03) 3px,
                              rgba(33,51,80,0.03) 4px
                            )
                          `,
                        }}
                      >
                        <div className="w-12 h-12 rounded-full bg-mcr-dark-blue text-mcr-ivory flex items-center justify-center font-bold text-lg mb-1">
                          {authorInitials}
                        </div>
                        <span className="text-[10px] text-mcr-dark-blue/70 font-medium text-center px-1 leading-tight">
                          {new Date(postcard.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "2-digit",
                          })}
                        </span>
                      </div>
                      {/* Stamp perforation effect */}
                      <div className="absolute -inset-1.5 border-2 border-dashed border-mcr-dark-blue/20 rounded-sm pointer-events-none" />
                    </div>
                  </div>

                  {/* Address lines */}
                  <div className="flex-1 flex flex-col justify-center space-y-3">
                    <div className="text-xs text-mcr-dark-blue/50 uppercase tracking-widest mb-2">From</div>
                    <div className="border-b border-mcr-dark-blue/30 pb-1">
                      <span className="font-semibold text-mcr-dark-blue text-base md:text-lg leading-tight block">
                        {postcard.training_title}
                      </span>
                    </div>
                    <div className="border-b border-mcr-dark-blue/30 pb-1">
                      <span className="text-mcr-dark-blue/80">
                        {authorName ?? "Unknown Author"}
                      </span>
                    </div>
                    <div className="border-b border-mcr-dark-blue/30 pb-1">
                      <span className="text-mcr-dark-blue/60 text-sm">
                        {new Date(postcard.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {/* Decorative empty lines */}
                    <div className="border-b border-mcr-dark-blue/20 h-4" />
                    <div className="border-b border-mcr-dark-blue/20 h-4" />
                  </div>

                  {/* Actions */}
                  {isOwner && (
                    <div className="flex justify-end pt-4 mt-auto">
                      <Button variant="outline" size="sm" asChild className="bg-white/80 hover:bg-white">
                        <Link href={`/postcards/${postcard.id}/edit`}>
                          <Pencil className="mr-2 h-3 w-3" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="absolute top-3 right-3 md:top-4 md:right-4 w-8 h-8 rounded-full bg-mcr-dark-blue/10 hover:bg-mcr-dark-blue/20 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-mcr-dark-blue" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {/* Card in Grid */}
      <div ref={cardRef} className="group cursor-pointer" onClick={handleOpen}>
        <Card className="h-full hover:border-mcr-light-blue hover:bg-muted/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg leading-tight">
                {postcard.training_title}
              </CardTitle>
              <div className="flex items-center gap-1.5 shrink-0">
                {postcard.visibility === "team" ? (
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
                <RotateCcw className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
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
                  <Badge key={section.key} className={`text-xs font-normal ${section.badgeClasses}`}>
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
            <p className="text-xs text-muted-foreground mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to flip over →
            </p>
          </CardContent>
        </Card>
      </div>

      {modal}
    </>
  );
}
