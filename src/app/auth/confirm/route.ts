import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail, isSafeNextPath } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next = isSafeNextPath(nextParam) ? nextParam : "/";

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // The magic-link form only validates the domain client-side, and
      // signInWithOtp can be called directly with the anon key — enforce the
      // domain here, server-side, before the session becomes usable.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !isAllowedEmail(user.email ?? "")) {
        console.error(
          `Unauthorized domain for email: ${user?.email ?? "(none)"}`
        );
        await supabase.auth.signOut();
        redirectTo.pathname = "/login";
        redirectTo.searchParams.delete("next");
        redirectTo.searchParams.set("error", "unauthorized_domain");
        return NextResponse.redirect(redirectTo);
      }

      redirectTo.searchParams.delete("next");
      return NextResponse.redirect(redirectTo);
    }
  }

  // Redirect to error page
  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("error", "auth_confirm_error");
  return NextResponse.redirect(redirectTo);
}
