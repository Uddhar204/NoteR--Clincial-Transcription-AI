// Edge-compatible JWT helpers for use in middleware.ts only.
// middleware.ts runs in the Next.js Edge Runtime which cannot import
// 'server-only' modules, so we keep this file separate from session.ts.
import { SignJWT, jwtVerify } from "jose";

export interface AccessPayload {
  email: string;
  expiresAt: string;
}

export interface RefreshPayload {
  email: string;
  expiresAt: string;
  type: "refresh";
}

function encodeKey(raw: string | undefined, name: string): Uint8Array {
  if (!raw) throw new Error(`${name} env var is not set`);
  return new TextEncoder().encode(raw);
}

export async function decryptAccess(token: string): Promise<AccessPayload | null> {
  try {
    const key = encodeKey(process.env.SESSION_SECRET, "SESSION_SECRET");
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload as unknown as AccessPayload;
  } catch { return null; }
}

export async function decryptRefresh(token: string): Promise<RefreshPayload | null> {
  try {
    const secret = process.env.SESSION_REFRESH_SECRET ?? process.env.SESSION_SECRET;
    const key = encodeKey(secret, "SESSION_REFRESH_SECRET");
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const p = payload as unknown as RefreshPayload;
    if (p.type !== "refresh") return null;
    return p;
  } catch { return null; }
}

export async function signAccessToken(payload: AccessPayload): Promise<string> {
  const key = encodeKey(process.env.SESSION_SECRET, "SESSION_SECRET");
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key);
}
