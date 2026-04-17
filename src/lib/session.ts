// Production-grade session management
// Pattern: short-lived access token (15 min) + long-lived refresh token (7 days)
// Both stored as HttpOnly cookies — XSS-proof, CSRF-protected via SameSite=lax
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// ── Constants ──────────────────────────────────────────────────
const ACCESS_TTL_MS  = 15 * 60 * 1000;        // 15 minutes
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ACCESS_COOKIE  = "noter_access";
const REFRESH_COOKIE = "noter_refresh";

// ── Key helpers ────────────────────────────────────────────────
function getKey(secret: string | undefined, name: string): Uint8Array {
  if (!secret) throw new Error(`${name} is not set in environment`);
  return new TextEncoder().encode(secret);
}

function accessKey()  { return getKey(process.env.SESSION_SECRET,         "SESSION_SECRET"); }
function refreshKey() { return getKey(process.env.SESSION_REFRESH_SECRET ?? process.env.SESSION_SECRET, "SESSION_REFRESH_SECRET"); }

// ── Token types ────────────────────────────────────────────────
export interface AccessPayload {
  email:     string;
  expiresAt: string;
}

export interface RefreshPayload {
  email:     string;
  expiresAt: string;
  type:      "refresh";
}

// ── Encrypt / Decrypt ──────────────────────────────────────────
async function signAccess(payload: AccessPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(accessKey());
}

async function signRefresh(payload: RefreshPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(refreshKey());
}

export async function decryptAccess(token: string): Promise<AccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessKey(), { algorithms: ["HS256"] });
    return payload as unknown as AccessPayload;
  } catch { return null; }
}

export async function decryptRefresh(token: string): Promise<RefreshPayload | null> {
  try {
    const { payload } = await jwtVerify(token, refreshKey(), { algorithms: ["HS256"] });
    const p = payload as unknown as RefreshPayload;
    if (p.type !== "refresh") return null;
    return p;
  } catch { return null; }
}

// ── Session creation (called on login) ────────────────────────
export async function createSession(email: string): Promise<void> {
  const now = Date.now();

  const [accessToken, refreshToken] = await Promise.all([
    signAccess({
      email,
      expiresAt: new Date(now + ACCESS_TTL_MS).toISOString(),
    }),
    signRefresh({
      email,
      expiresAt: new Date(now + REFRESH_TTL_MS).toISOString(),
      type: "refresh",
    }),
  ]);

  const secure = process.env.NODE_ENV === "production";
  const cookieStore = await cookies();

  // Short-lived access token — checked on every request
  cookieStore.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    expires: new Date(now + ACCESS_TTL_MS),
    sameSite: "lax",
    path: "/",
  });

  // Long-lived refresh token — only used to re-issue access tokens
  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    expires: new Date(now + REFRESH_TTL_MS),
    sameSite: "lax",
    path: "/",
  });
}

// ── Session refresh (called by middleware on expiry) ───────────
export async function refreshSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return false;

  const payload = await decryptRefresh(refreshToken);
  if (!payload) return false;

  // Issue new access token
  const newAccess = await signAccess({
    email: payload.email,
    expiresAt: new Date(Date.now() + ACCESS_TTL_MS).toISOString(),
  });

  cookieStore.set(ACCESS_COOKIE, newAccess, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + ACCESS_TTL_MS),
    sameSite: "lax",
    path: "/",
  });

  return true;
}

// ── Get current session payload ─────────────────────────────────
export async function getSession(): Promise<AccessPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  return decryptAccess(token);
}

// ── Delete session (logout) ────────────────────────────────────
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

// ── Auth guard — use in Server Components / Server Actions ─────
export async function requireAuth(): Promise<AccessPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// ── Legacy alias — keeps existing imports working ─────────────
export type SessionPayload = AccessPayload;
