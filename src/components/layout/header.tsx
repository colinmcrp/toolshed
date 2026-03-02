"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  user: {
    email?: string;
    user_metadata?: {
      full_name?: string;
    };
  } | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() ?? "U";
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
      <Link href="/">
        <Image
          src="/MCR_LOGO.svg"
          alt="MCR Pathways"
          width={120}
          height={36}
          priority
        />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(user?.user_metadata?.full_name, user?.email)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium truncate">
              {user?.user_metadata?.full_name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
