import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "@/types/database";

// Mock user for development
const DEV_USER = {
  id: "dev-user-id",
  email: "dev@mcrpathways.org",
  user_metadata: {
    full_name: "Dev User",
  },
  created_at: new Date().toISOString(),
};

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

// Cached version to deduplicate requests within a single render
export const getUser = cache(async () => {
  // Return mock user in development
  if (process.env.NODE_ENV === "development") {
    return DEV_USER as any;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getSession = cache(async () => {
  // Return mock session in development
  if (process.env.NODE_ENV === "development") {
    return { user: DEV_USER } as any;
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
});
