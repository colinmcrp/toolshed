import Link from "next/link";
import { Lock, Globe, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const tools = [
  {
    href: "/secure-zip",
    icon: Lock,
    title: "Secure Zip",
    description: "Create password-protected zip archives.",
  },
  {
    href: "/html-host",
    icon: Globe,
    title: "HTML Host",
    description: "Host and share HTML artifacts by link.",
  },
  {
    href: "/dsa-builder",
    icon: FileText,
    title: "DSA Builder",
    description: "Generate a Data Sharing Agreement Word document.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Toolshed</h1>
        <p className="text-sm text-muted-foreground">
          Small utilities for MCR Pathways.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group">
            <Card className="h-full transition-colors group-hover:bg-accent">
              <CardContent className="flex flex-col gap-3 p-6">
                <tool.icon className="h-6 w-6 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium leading-none">{tool.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {tool.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
