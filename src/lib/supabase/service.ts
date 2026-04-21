/**
 * Service-role Supabase client for server-only code.
 *
 * This client uses the Supabase service-role key, which bypasses all RLS policies.
 * Use ONLY in server-side code (server components, route handlers, API routes).
 * Do NOT import from client components.
 *
 * Primary use case: the public `/[...path]` viewer route reads any artifact regardless of owner.
 * Secondary use: any server code that legitimately needs to bypass RLS.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
