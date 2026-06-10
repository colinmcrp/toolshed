import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail, isSafeNextPath } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = isSafeNextPath(nextParam) ? nextParam : "/";

  // Behind Vercel's proxy `origin` can be the internal deployment host;
  // x-forwarded-host carries the public-facing domain the user is actually on.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const baseUrl = !isLocalEnv && forwardedHost ? `https://${forwardedHost}` : origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure user has a profile
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const email = user.email ?? "";

        if (!isAllowedEmail(email)) {
          console.error(`Unauthorized domain for email: ${email}`);
          // exchangeCodeForSession already set session cookies — destroy the
          // session, don't just redirect, or the user stays signed in.
          await supabase.auth.signOut();
          return NextResponse.redirect(
            `${baseUrl}/login?error=unauthorized_domain`
          );
        }

        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingProfile) {
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            email
              .split("@")[0]
              ?.split(".")
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join(" ") ||
            null;

          await supabase.from("profiles").insert({
            id: user.id,
            full_name: fullName,
            role: "staff",
          });
        }
      }

      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // Return to login page with error
  return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_error`);
}
