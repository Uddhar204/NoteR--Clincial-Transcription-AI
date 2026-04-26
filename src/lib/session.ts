// Production-grade session management
// Pattern: short-lived access token (15 min) + long-lived refresh token (7 days)
// Both stored as HttpOnly cookies — XSS-proof, CSRF-protected via SameSite=lax
import "server-only";
import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "crypto";

// ── Constants ──────────────────────────────────────────────────
const ACCESS_TTL_MS  = 15 * 60 * 1000;        // 15 minutes
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ACCESS_COOKIE  = "noter_access";
const REFRESH_COOKIE = "noter_refresh";

// ── Key helpers ────────────────────────────────────────────────
// JWE with dir+A256GCM requires exactly 32 bytes (256 bits).
// SHA-256 hash the secret to guarantee the correct length.
function getKey(secret: string | undefined, name: string): Uint8Array {
  if (!secret) throw new Error(`${name} is not set in environment`);
  const hash = createHash("sha256").update(secret).digest();
  return new Uint8Array(hash);
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

// ── Encrypt / Decrypt (JWE — payload is ciphertext, not just signed) ──
async function encryptAccess(payload: AccessPayload): Promise<string> {
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .encrypt(accessKey());
}

async function encryptRefresh(payload: RefreshPayload): Promise<string> {
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .encrypt(refreshKey());
}

export async function decryptAccess(token: string): Promise<AccessPayload | null> {
  try {
    const { payload } = await jwtDecrypt(token, accessKey());
    return payload as unknown as AccessPayload;
  } catch { return null; }
}

export async function decryptRefresh(token: string): Promise<RefreshPayload | null> {
  try {
    const { payload } = await jwtDecrypt(token, refreshKey());
    const p = payload as unknown as RefreshPayload;
    if (p.type !== "refresh") return null;
    return p;
  } catch { return null; }
}

// ── Session creation (called on login) ────────────────────────
export async function createSession(email: string): Promise<void> {
  const now = Date.now();

  const [accessToken, refreshToken] = await Promise.all([
    encryptAccess({
      email,
      expiresAt: new Date(now + ACCESS_TTL_MS).toISOString(),
    }),
    encryptRefresh({
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
  const newAccess = await encryptAccess({
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
