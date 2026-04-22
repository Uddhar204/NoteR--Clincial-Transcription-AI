// AES-256-GCM field-level encryption for patient records.
// Each encrypt() call generates a unique random IV, preventing pattern analysis.
// Output format: hex(iv):hex(authTag):hex(ciphertext)

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;       // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;      // 128-bit authentication tag

// ── Key management ─────────────────────────────────────────────
let _keyBuffer: Buffer | null = null;

function getKey(): Buffer {
  if (_keyBuffer) return _keyBuffer;
  const hex = process.env.RECORD_ENCRYPTION_SECRET;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "RECORD_ENCRYPTION_SECRET must be a 64-char hex string (32 bytes)"
    );
  }
  _keyBuffer = Buffer.from(hex, "hex");
  return _keyBuffer;
}

// ── Encrypt a plaintext string ─────────────────────────────────
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // iv:tag:ciphertext  — all hex, easy to store as a single string
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

// ── Decrypt a ciphertext string ────────────────────────────────
export function decrypt(packed: string): string {
  const parts = packed.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format — expected iv:tag:ciphertext");
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ── Convenience: encrypt a JSON-serialisable object ────────────
export function encryptObject<T>(obj: T): string {
  return encrypt(JSON.stringify(obj));
}

// ── Convenience: decrypt back to a typed object ────────────────
export function decryptObject<T>(packed: string): T {
  return JSON.parse(decrypt(packed)) as T;
}

// ── Safe decrypt — returns null instead of throwing ────────────
export function safeDecrypt(packed: string): string | null {
  try {
    return decrypt(packed);
  } catch {
    return null;
  }
}
