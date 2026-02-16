import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isStaffEmail, getEmailDomainPart } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure user has a profile
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingProfile) {
          // Determine role and partner_id from email domain
          const email = user.email ?? "";
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            email
              .split("@")[0]
              ?.split(".")
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join(" ") ||
            null;

          let role: "staff" | "partner" = "staff";
          let partnerId: string | null = null;

          if (!isStaffEmail(email)) {
            // Check if this is a partner domain
            const domain = getEmailDomainPart(email);
            const { data: partnerDomain } = await supabase
              .from("partner_domains")
              .select("partner_id")
              .eq("domain", domain)
              .single();

            if (partnerDomain) {
              role = "partner";
              partnerId = partnerDomain.partner_id;
            }
          }

          await supabase.from("profiles").insert({
            id: user.id,
            full_name: fullName,
            role,
            partner_id: partnerId,
          });
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return to login page with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
