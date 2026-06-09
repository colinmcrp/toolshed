"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Keeps the Supabase access-token cookie fresh while a dashboard page is left
// open. Nothing else does this: the middleware only refreshes the session on a
// navigation/request, and the rest of the dashboard issues no requests while a
// long-lived page (e.g. the DSA Builder wizard) is filled in. Mounting a
// browser client starts @supabase/ssr's auto-refresh ticker; we also nudge it
// when the tab regains focus, in case it was backgrounded past the token
// lifetime (the ticker pauses while hidden). Without this, a slow form can POST
// a server action with a lapsed session and fail with "Not signed in".
export function SessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let lastRefreshed = 0;

    // getSession() reads the cached session and only hits the network when the
    // token is expired and needs refreshing — unlike getUser(), which makes a
    // request every call to validate the JWT. Throttle to once a minute so
    // rapid focus changes (e.g. copy-pasting fields in and out of the tab)
    // don't pile up redundant checks.
    const refresh = () => {
      if (!active) return;
      const now = Date.now();
      if (now - lastRefreshed < 60_000) return;
      lastRefreshed = now;
      void supabase.auth.getSession();
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
