// Production middleware: access token check + automatic refresh
// Uses the short-lived access token (15 min) and long-lived refresh token (7 days).
// If the access token is expired but the refresh token is valid,
// a new access token is issued transparently — no re-login needed.
import { NextRequest, NextResponse } from "next/server";
import { decryptAccess, decryptRefresh, signAccessToken } from "@/lib/middleware-session";

// ── Public routes — no auth required ──────────────────────────
const PUBLIC = ["/login", "/api/vapi/webhook", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const accessToken  = request.cookies.get("noter_access")?.value;
  const refreshToken = request.cookies.get("noter_refresh")?.value;

  // ── 1. Try access token ────────────────────────────────────
  if (accessToken) {
    const session = await decryptAccess(accessToken);
    if (session) {
      // Valid — pass through
      return NextResponse.next();
    }
  }

  // ── 2. Access token expired/missing — try refresh ──────────
  if (refreshToken) {
    const refreshPayload = await decryptRefresh(refreshToken);
    if (refreshPayload) {
      // Issue a new 15-min access token
      const newAccess = await signAccessToken({
        email:     refreshPayload.email,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });

      const response = NextResponse.next();
      response.cookies.set("noter_access", newAccess, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        maxAge:   15 * 60,
        sameSite: "lax",
        path:     "/",
      });
      return response;
    }
  }

  // ── 3. No valid tokens — redirect to login ──────────────────
  const loginUrl = new URL("/login", request.url);
  // Preserve the intended destination for post-login redirect
  if (pathname !== "/") {
    loginUrl.searchParams.set("from", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)).*)"],
};
