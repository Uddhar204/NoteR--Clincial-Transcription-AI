// Edge-compatible JWE helpers for use in middleware.ts only.
// middleware.ts runs in the Next.js Edge Runtime which cannot import
// 'server-only' modules, so we keep this file separate from session.ts.
//
// Upgraded to JWE (encrypted tokens) — payload is ciphertext, not readable.
import { EncryptJWT, jwtDecrypt } from "jose";

export interface AccessPayload {
  email: string;
  expiresAt: string;
}

export interface RefreshPayload {
  email: string;
  expiresAt: string;
  type: "refresh";
}

// Edge Runtime doesn't have Node's crypto module, so we use SubtleCrypto
// to derive a fixed 32-byte key via SHA-256.
let _accessKeyCache: Uint8Array | null = null;
let _refreshKeyCache: Uint8Array | null = null;

async function deriveKey(raw: string | undefined, name: string): Promise<Uint8Array> {
  if (!raw) throw new Error(`${name} env var is not set`);
  const encoded = new TextEncoder().encode(raw);
  const hashBuf = await crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(hashBuf);
}

async function accessKey(): Promise<Uint8Array> {
  if (_accessKeyCache) return _accessKeyCache;
  _accessKeyCache = await deriveKey(process.env.SESSION_SECRET, "SESSION_SECRET");
  return _accessKeyCache;
}

async function refreshKey(): Promise<Uint8Array> {
  if (_refreshKeyCache) return _refreshKeyCache;
  const secret = process.env.SESSION_REFRESH_SECRET ?? process.env.SESSION_SECRET;
  _refreshKeyCache = await deriveKey(secret, "SESSION_REFRESH_SECRET");
  return _refreshKeyCache;
}

export async function decryptAccess(token: string): Promise<AccessPayload | null> {
  try {
    const key = await accessKey();
    const { payload } = await jwtDecrypt(token, key);
    return payload as unknown as AccessPayload;
  } catch { return null; }
}

export async function decryptRefresh(token: string): Promise<RefreshPayload | null> {
  try {
    const key = await refreshKey();
    const { payload } = await jwtDecrypt(token, key);
    const p = payload as unknown as RefreshPayload;
    if (p.type !== "refresh") return null;
    return p;
  } catch { return null; }
}

export async function signAccessToken(payload: AccessPayload): Promise<string> {
  const key = await accessKey();
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .encrypt(key);
}
