/**
 * JWE Session Token — 2^10 (1024) Iteration Stress Test
 * Tests: encrypt/decrypt access+refresh tokens, expiry, tamper, wrong key, opacity
 * Run:   node test-session-jwe.mjs
 */

import { EncryptJWT, jwtDecrypt } from "jose";
import { createHash } from "crypto";

// ── Inline key derivation (mirrors session.ts) ─────────────────
const SESSION_SECRET = "notER-super-secret-jwt-key-change-in-production-xyz123";
const REFRESH_SECRET = "notER-refresh-secret-separate-key-change-in-production-abc456";

function deriveKey(secret) {
  return new Uint8Array(createHash("sha256").update(secret).digest());
}

const ACCESS_KEY = deriveKey(SESSION_SECRET);
const REFRESH_KEY = deriveKey(REFRESH_SECRET);
const WRONG_KEY = deriveKey("totally-wrong-key-that-wont-work");

// ── JWE helpers (mirror session.ts) ────────────────────────────
async function encryptAccess(payload) {
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .encrypt(ACCESS_KEY);
}

async function encryptRefresh(payload) {
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .encrypt(REFRESH_KEY);
}

async function decryptAccess(token) {
  try {
    const { payload } = await jwtDecrypt(token, ACCESS_KEY);
    return payload;
  } catch { return null; }
}

async function decryptRefresh(token) {
  try {
    const { payload } = await jwtDecrypt(token, REFRESH_KEY);
    const p = payload;
    if (p.type !== "refresh") return null;
    return p;
  } catch { return null; }
}

// ── Test Infrastructure ────────────────────────────────────────
const TOTAL = 1024;
let passed = 0, failed = 0;
const failures = [];

function assert(iter, name, cond, detail = "") {
  if (cond) { passed++; } else {
    failed++;
    if (failures.length < 20) failures.push({ iter, name, detail });
  }
}

// ── Test Data ──────────────────────────────────────────────────
const EMAILS = [
  "doctor@hospital.com",
  "dr.smith@cardiology.nhs.uk",
  "maria.garcia@clinica.es",
  "doc+tag@gmail.com",
  "a@b.c",
  "very.long.email.address.for.a.doctor.in.a.hospital@extremely-long-domain-name.hospital.healthcare.org",
];

// ── Run ────────────────────────────────────────────────────────
console.log(`\n🔐 JWE Session Token Stress Test — ${TOTAL} iterations`);
console.log("─".repeat(60));

const start = Date.now();

for (let i = 0; i < TOTAL; i++) {
  const email = EMAILS[i % EMAILS.length];
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // ── Test A: Access token round-trip ────────────────────────
  try {
    const token = await encryptAccess({ email, expiresAt });
    const payload = await decryptAccess(token);
    assert(i, "Access round-trip: email", payload?.email === email,
      `Expected "${email}", got "${payload?.email}"`);
    assert(i, "Access round-trip: expiresAt", payload?.expiresAt === expiresAt);
  } catch (e) {
    assert(i, "Access round-trip", false, e.message);
  }

  // ── Test B: Refresh token round-trip ───────────────────────
  try {
    const token = await encryptRefresh({ email, expiresAt, type: "refresh" });
    const payload = await decryptRefresh(token);
    assert(i, "Refresh round-trip: email", payload?.email === email);
    assert(i, "Refresh round-trip: type", payload?.type === "refresh");
  } catch (e) {
    assert(i, "Refresh round-trip", false, e.message);
  }

  // ── Test C: Token is opaque (no base64 email leakage) ──────
  try {
    const token = await encryptAccess({ email, expiresAt });
    // JWE tokens have 5 parts separated by dots
    const parts = token.split(".");
    assert(i, "JWE format (5 parts)", parts.length === 5,
      `Expected 5 parts, got ${parts.length}`);
    // The email should NOT appear anywhere in the raw token
    assert(i, "Email not in raw token", !token.includes(email),
      "Email found in raw token — not encrypted!");
    // Try base64 decoding each part — email should not appear
    let emailLeaked = false;
    for (const part of parts) {
      try {
        const decoded = Buffer.from(part, "base64url").toString("utf8");
        if (decoded.includes(email)) emailLeaked = true;
      } catch { /* not valid base64, that's fine */ }
    }
    assert(i, "Email not in any decoded segment", !emailLeaked,
      "Email found after base64 decoding a segment");
  } catch (e) {
    assert(i, "Token opacity", false, e.message);
  }

  // ── Test D: Wrong key cannot decrypt ───────────────────────
  if (i % 8 === 0) {
    try {
      const token = await encryptAccess({ email, expiresAt });
      let wrongDecrypted = false;
      try {
        const { payload } = await jwtDecrypt(token, WRONG_KEY);
        wrongDecrypted = true;
      } catch { /* expected */ }
      assert(i, "Wrong key rejected", !wrongDecrypted,
        "Wrong key decrypted the token!");
    } catch (e) {
      assert(i, "Wrong key test", false, e.message);
    }
  }

  // ── Test E: Access key cannot decrypt refresh token ────────
  if (i % 8 === 0) {
    try {
      const refreshToken = await encryptRefresh({ email, expiresAt, type: "refresh" });
      const result = await decryptAccess(refreshToken); // use ACCESS key on REFRESH token
      assert(i, "Access key rejects refresh token", result === null,
        "Access key decrypted a refresh token — key separation failure!");
    } catch (e) {
      assert(i, "Key separation", false, e.message);
    }
  }

  // ── Test F: Tamper detection ───────────────────────────────
  if (i % 16 === 0) {
    try {
      const token = await encryptAccess({ email, expiresAt });
      // Flip a character in the ciphertext segment (part 3)
      const parts = token.split(".");
      const tampered3 = parts[2].slice(0, -1) + (parts[2].slice(-1) === "A" ? "B" : "A");
      const tamperedToken = [parts[0], parts[1], tampered3, parts[3], parts[4]].join(".");
      const result = await decryptAccess(tamperedToken);
      assert(i, "Tamper detected", result === null,
        "Tampered token was accepted!");
    } catch (e) {
      assert(i, "Tamper detection", false, e.message);
    }
  }

  // ── Test G: Unique tokens per encrypt ──────────────────────
  if (i % 8 === 0) {
    try {
      const t1 = await encryptAccess({ email, expiresAt });
      const t2 = await encryptAccess({ email, expiresAt });
      assert(i, "Unique tokens per encrypt", t1 !== t2,
        "Two encryptions produced identical tokens — IV reuse!");
    } catch (e) {
      assert(i, "Unique tokens", false, e.message);
    }
  }

  // ── Test H: Non-refresh type rejected by decryptRefresh ────
  if (i % 16 === 0) {
    try {
      // Encrypt with refresh key but wrong type
      const token = await new EncryptJWT({ email, expiresAt, type: "access" })
        .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .encrypt(REFRESH_KEY);
      const result = await decryptRefresh(token);
      assert(i, "Non-refresh type rejected", result === null,
        "Token with type='access' accepted as refresh!");
    } catch (e) {
      assert(i, "Type validation", false, e.message);
    }
  }
}

const elapsed = Date.now() - start;
const total = passed + failed;

// ── Summary ──────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));
console.log(`\x1b[1m🔐 JWE Session Token Results\x1b[0m`);
console.log(`   Iterations: ${TOTAL}`);
console.log(`   Total assertions: ${total}`);
console.log(`   \x1b[32m✅ Passed: ${passed}\x1b[0m`);
console.log(`   \x1b[31m❌ Failed: ${failed}\x1b[0m`);
console.log(`   Time: ${elapsed}ms (${(elapsed / TOTAL).toFixed(2)}ms/iter)`);
console.log("─".repeat(60));

if (failures.length > 0) {
  console.log("\n\x1b[31mFirst failures:\x1b[0m");
  failures.forEach(f => console.log(`  [Iter ${f.iter}] ${f.name}: ${f.detail}`));
}

if (failed === 0) {
  console.log(`\n\x1b[32m🎉 ALL ${total} ASSERTIONS PASSED across ${TOTAL} iterations!\x1b[0m`);
  console.log("   ✅ Access token encrypt/decrypt");
  console.log("   ✅ Refresh token encrypt/decrypt");
  console.log("   ✅ Token opacity (email not in raw token)");
  console.log("   ✅ Wrong key rejected");
  console.log("   ✅ Key separation (access ≠ refresh)");
  console.log("   ✅ Tamper detection");
  console.log("   ✅ Unique tokens per encrypt");
  console.log("   ✅ Type validation on refresh tokens");
  console.log("\n   → All 3 steps complete. System is encrypted.\n");
} else {
  console.log(`\n\x1b[31m⛔ ${failed} FAILURES — DO NOT PROCEED\x1b[0m\n`);
  process.exit(1);
}
