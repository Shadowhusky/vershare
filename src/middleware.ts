import { NextRequest, NextResponse } from "next/server";

// Routes open to cross-origin requests
const CORS_OPEN = ["/api/doc/llm", "/api/shares", "/api/drop"];

function isCorsOpen(pathname: string) {
  return CORS_OPEN.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // Canonical host: redirect www to apex
  const host = request.headers.get("host") || "";
  if (host.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.host = host.slice(4);
    return NextResponse.redirect(url, 301);
  }

  // Themed deep-link: ?theme=dark|light persists the theme as a cookie so an
  // embed (e.g. the TV iframe on richardliao.uk) can force a theme without
  // access to the site's localStorage. SSR reads the cookie on this same
  // request, so there is no light-then-dark flash.
  const themeParam = request.nextUrl.searchParams.get("theme");
  if (
    (themeParam === "dark" || themeParam === "light") &&
    !pathname.startsWith("/api/")
  ) {
    request.cookies.set("vershare_theme", themeParam);
    const response = NextResponse.next({ request });
    response.cookies.set("vershare_theme", themeParam, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
    return response;
  }

  // Admin routes — protected by admin login (cookie auth in the routes themselves)
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  // Open CORS routes — allow any origin
  if (isCorsOpen(pathname)) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders(origin || "*"),
      });
    }
    const response = NextResponse.next();
    for (const [k, v] of Object.entries(corsHeaders(origin || "*"))) {
      response.headers.set(k, v);
    }
    return response;
  }

  // Other /api routes — same-origin only
  if (pathname.startsWith("/api/")) {
    if (!origin) return NextResponse.next();

    try {
      const host = request.headers.get("host");
      const originHost = new URL(origin).host;
      if (originHost === host) {
        const response = NextResponse.next();
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type");
        return response;
      }
    } catch {
      // invalid origin
    }

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 403 });
    }

    return NextResponse.json(
      { error: "Cross-origin requests not allowed. Use /api/doc/llm for API docs." },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
