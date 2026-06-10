import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { RESERVED_SLUGS } from "@/lib/html-host/slug";
import { isAllowedEmail } from "@/lib/auth";

function isArtifactUrl(pathname: string): boolean {
  if (pathname === '/') return false;
  const first = pathname.split('/')[1];
  if (!first) return false;
  // Strip .html suffix if present so 'foo.html' maps to 'foo' for reservation check
  const firstNoExt = first.endsWith('.html') ? first.slice(0, -5) : first;
  return !RESERVED_SLUGS.has(firstNoExt) && !RESERVED_SLUGS.has(first);
}

export async function updateSession(request: NextRequest) {
  // Skip auth in development
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Domain backstop: a session with a non-allowed email is never usable.
  // (The auth callback/confirm routes also reject these, but a session can
  // exist before those checks run — e.g. exchangeCodeForSession sets cookies
  // before the email is inspected.) API routes are exempt: they don't
  // authenticate via session cookies, and a 307-to-login is the wrong shape
  // for an API response.
  if (
    user &&
    !isAllowedEmail(user.email ?? "") &&
    !request.nextUrl.pathname.startsWith("/api/")
  ) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[middleware] signOut failed for disallowed session:", err);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "error=unauthorized_domain";
    const redirect = NextResponse.redirect(url);
    // Carry the signed-out cookie state onto the redirect response.
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    // Belt and braces: expire the Supabase auth cookies directly so that even
    // a failed signOut (auth server unreachable) cannot leave this redirect
    // looping with a still-live session cookie.
    for (const { name } of request.cookies.getAll()) {
      if (name.startsWith("sb-")) {
        redirect.cookies.set(name, "", { maxAge: 0, path: "/" });
      }
    }
    return redirect;
  }

  // Define public routes that don't require authentication
  const publicRoutes = ["/login", "/signup", "/auth/callback", "/auth/confirm"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  if (!user && !isPublicRoute && !isApiRoute && !isArtifactUrl(request.nextUrl.pathname)) {
    // No user and trying to access protected route, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (
    user &&
    (request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/signup")
  ) {
    // User is logged in but trying to access auth pages, redirect to dashboard
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Role-based access: restrict partner users to allowed routes
  if (user && !isPublicRoute && !isApiRoute && !isArtifactUrl(request.nextUrl.pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "partner") {
      const partnerAllowedPaths = [
        "/partnerships/portal",
        "/profile",
      ];
      const isAllowed = partnerAllowedPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
      );
      // Also allow the root path (will redirect to portal)
      const isRoot = request.nextUrl.pathname === "/";

      if (!isAllowed && !isRoot) {
        const url = request.nextUrl.clone();
        url.pathname = "/partnerships/portal";
        return NextResponse.redirect(url);
      }

      // Redirect partner users from root to portal
      if (isRoot) {
        const url = request.nextUrl.clone();
        url.pathname = "/partnerships/portal";
        return NextResponse.redirect(url);
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse;
}
