"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Keeps the Supabase access-token cookie fresh while a dashboard page is left
// open. Nothing else does this: the middleware only refreshes the session on a
// navigation/request, and the rest of the dashboard issues no requests while a
// long-lived page (e.g. the DSA Builder wizard) is filled in. Mounting a
// browser client starts @supabase/ssr's auto-refresh ticker; we also
// re-validate when the tab regains focus, in case it was backgrounded past the
// token lifetime (the ticker pauses while hidden). Without this, a slow form
// can POST a server action with a lapsed session and fail with "Not signed in".
export function SessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    // Reading the session initialises the client and its refresh ticker.
    const refresh = () => {
      if (active) void supabase.auth.getUser();
    };
    refresh();

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return null;
}
