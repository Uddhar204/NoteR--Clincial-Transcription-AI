/**
 * Qdrant Encryption Integration — 2^10 (1024) Iteration Stress Test
 * Tests: encrypt-before-store logic, decrypt-after-read logic, migration compat
 * Run:   node test-qdrant-encryption.mjs
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ── Inline encryption (mirrors src/lib/encryption.ts) ──────────
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_HEX = "a1b2c3d4e5f6071829304a5b6c7d8e9fa1b2c3d4e5f6071829304a5b6c7d8e9f";
const KEY = Buffer.from(KEY_HEX, "hex");

function encrypt(plaintext) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv, { authTagLength: TAG_LENGTH });
  let enc = cipher.update(plaintext, "utf8", "hex");
  enc += cipher.final("hex");
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${enc}`;
}

function decrypt(packed) {
  const [ivHex, tagHex, cipherHex] = packed.split(":");
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, "hex"), { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let dec = decipher.update(cipherHex, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
}

function safeDecrypt(packed) {
  try { return decrypt(packed); } catch { return null; }
}

// ── Simulate the exact Qdrant store/retrieve flow ──────────────
// This mirrors what qdrant-client.ts does WITHOUT hitting the real DB

function simulateStoreConsultation(record) {
  // This is exactly what storeConsultation() now does
  return {
    id: record.id,
    payload: {
      patientName:   encrypt(record.patientName),
      date:          record.date,
      summary:       encrypt(record.summary),
      keywords:      encrypt(JSON.stringify(record.keywords)),
      soapNotes:     encrypt(record.soapNotes),
      prescriptions: encrypt(record.prescriptions),
      transcript:    encrypt(record.transcript),
      _encrypted:    true,
    },
  };
}

function simulateReadRecord(point) {
  // This is exactly what searchPatientHistory / getAllConsultations does
  const isEncrypted = point.payload?._encrypted === true;
  return {
    id: String(point.id),
    patientName: isEncrypted
      ? (safeDecrypt(point.payload?.patientName) ?? "Unknown")
      : (point.payload?.patientName) || "Unknown",
    date: (point.payload?.date) || "",
    summary: isEncrypted
      ? (safeDecrypt(point.payload?.summary) ?? "")
      : (point.payload?.summary) || "",
    keywords: isEncrypted
      ? JSON.parse(safeDecrypt(point.payload?.keywords) ?? "[]")
      : (point.payload?.keywords) || [],
    soapNotes: isEncrypted
      ? (safeDecrypt(point.payload?.soapNotes) ?? "{}")
      : (point.payload?.soapNotes) || "{}",
    prescriptions: isEncrypted
      ? (safeDecrypt(point.payload?.prescriptions) ?? "[]")
      : (point.payload?.prescriptions) || "[]",
  };
}

function simulateReadLegacyRecord(point) {
  // Unencrypted (old) record — same logic with _encrypted absent
  const isEncrypted = point.payload?._encrypted === true;
  return {
    id: String(point.id),
    patientName: isEncrypted
      ? (safeDecrypt(point.payload?.patientName) ?? "Unknown")
      : (point.payload?.patientName) || "Unknown",
    date: (point.payload?.date) || "",
    summary: isEncrypted
      ? (safeDecrypt(point.payload?.summary) ?? "")
      : (point.payload?.summary) || "",
    keywords: isEncrypted
      ? JSON.parse(safeDecrypt(point.payload?.keywords) ?? "[]")
      : (point.payload?.keywords) || [],
    soapNotes: isEncrypted
      ? (safeDecrypt(point.payload?.soapNotes) ?? "{}")
      : (point.payload?.soapNotes) || "{}",
    prescriptions: isEncrypted
      ? (safeDecrypt(point.payload?.prescriptions) ?? "[]")
      : (point.payload?.prescriptions) || "[]",
  };
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
const RECORDS = [
  {
    id: "rec-001",
    patientName: "John Smith",
    date: "2026-04-22T00:00:00Z",
    summary: "Patient with chest pain, prescribed Aspirin",
    keywords: ["chest pain", "aspirin", "cardiology"],
    transcript: "Doctor: Hello. Patient: I have chest pain.",
    soapNotes: JSON.stringify({ subjective: "Chest pain x 2 weeks", objective: "BP 140/90", assessment: "Unstable angina", plan: "Start Aspirin" }),
    prescriptions: JSON.stringify([{ drug: "Aspirin", dosage: "150mg", frequency: "Daily", duration: "Lifelong" }]),
  },
  {
    id: "rec-002",
    patientName: "María García López",
    date: "2026-04-21T12:00:00Z",
    summary: "Routine checkup, no issues",
    keywords: ["routine", "checkup"],
    transcript: "Doctor: How have you been? Patient: Fine, doctor.",
    soapNotes: JSON.stringify({ subjective: "No complaints", objective: "All normal", assessment: "Healthy", plan: "Follow up in 6 months" }),
    prescriptions: JSON.stringify([]),
  },
  {
    id: "rec-003",
    patientName: "田中太郎",
    date: "2026-04-20T08:00:00Z",
    summary: "Hypertension management, 3 drug regimen",
    keywords: ["hypertension", "metoprolol", "amlodipine", "losartan"],
    transcript: "Doctor: BP 180/110. I'm adding Losartan 50mg. Patient: OK.",
    soapNotes: JSON.stringify({ subjective: "Headaches, dizziness", objective: "BP 180/110, HR 72", assessment: "Uncontrolled HTN", plan: "Triple therapy" }),
    prescriptions: JSON.stringify([
      { drug: "Metoprolol", dosage: "50mg", frequency: "BID", duration: "3 months" },
      { drug: "Amlodipine", dosage: "5mg", frequency: "Daily", duration: "3 months" },
      { drug: "Losartan", dosage: "50mg", frequency: "Daily", duration: "3 months" },
    ]),
  },
  {
    id: "rec-004",
    patientName: "",
    date: "",
    summary: "",
    keywords: [],
    transcript: "",
    soapNotes: "{}",
    prescriptions: "[]",
  },
  {
    id: "rec-005",
    patientName: "O'Brien-McCarthy \"Jr.\"",
    date: "2026-04-19T00:00:00Z",
    summary: "Special chars: <>&\"' test",
    keywords: ["edge", "case", "special-chars"],
    transcript: "Doctor: \"Take 2 tablets\" — patient's response: 'OK & understood'",
    soapNotes: JSON.stringify({ subjective: "Patient's \"complaint\"", objective: "N/A", assessment: "<pending>", plan: "Follow-up & review" }),
    prescriptions: JSON.stringify([{ drug: "Drug 'A' & \"B\"", dosage: "10mg", frequency: "PRN", duration: "As needed" }]),
  },
];

// ── Run ────────────────────────────────────────────────────────
console.log(`\n🔐 Qdrant Encryption Integration — ${TOTAL} iterations`);
console.log("─".repeat(60));

const start = Date.now();

for (let i = 0; i < TOTAL; i++) {
  const record = RECORDS[i % RECORDS.length];

  // ── Test A: Full round-trip (store → read) ─────────────────
  try {
    const stored = simulateStoreConsultation(record);
    const read = simulateReadRecord(stored);

    assert(i, "patientName round-trip", read.patientName === record.patientName,
      `Expected "${record.patientName}", got "${read.patientName}"`);
    assert(i, "date preserved", read.date === record.date);
    assert(i, "summary round-trip", read.summary === record.summary);
    assert(i, "keywords round-trip",
      JSON.stringify(read.keywords) === JSON.stringify(record.keywords));
    assert(i, "soapNotes round-trip", read.soapNotes === record.soapNotes);
    assert(i, "prescriptions round-trip", read.prescriptions === record.prescriptions);
  } catch (e) {
    assert(i, "Round-trip", false, e.message);
  }

  // ── Test B: Payload is ciphertext (not readable) ───────────
  try {
    const stored = simulateStoreConsultation(record);
    if (record.patientName.length > 0) {
      assert(i, "patientName is ciphertext",
        stored.payload.patientName !== record.patientName,
        "Name stored as plaintext!");
    }
    if (record.transcript.length > 0) {
      assert(i, "transcript is ciphertext",
        stored.payload.transcript !== record.transcript,
        "Transcript stored as plaintext!");
    }
    assert(i, "_encrypted flag set", stored.payload._encrypted === true);
  } catch (e) {
    assert(i, "Ciphertext check", false, e.message);
  }

  // ── Test C: Date is NOT encrypted (for sorting) ────────────
  try {
    const stored = simulateStoreConsultation(record);
    assert(i, "date stays plaintext", stored.payload.date === record.date,
      `Date was encrypted: ${stored.payload.date}`);
  } catch (e) {
    assert(i, "Date plaintext", false, e.message);
  }

  // ── Test D: Legacy (unencrypted) record compatibility ──────
  if (i % 4 === 0) {
    try {
      const legacyPoint = {
        id: "legacy-" + i,
        payload: {
          patientName: record.patientName,
          date: record.date,
          summary: record.summary,
          keywords: record.keywords,
          soapNotes: record.soapNotes,
          prescriptions: record.prescriptions,
          // NO _encrypted flag
        },
      };
      const read = simulateReadLegacyRecord(legacyPoint);
      // Note: empty strings fall through to "Unknown" / "" via the || fallback
      const expectedName = record.patientName || "Unknown";
      const expectedSummary = record.summary || "";
      assert(i, "Legacy patientName", read.patientName === expectedName,
        `Expected "${expectedName}", got "${read.patientName}"`);
      assert(i, "Legacy summary", read.summary === expectedSummary);
      assert(i, "Legacy keywords",
        JSON.stringify(read.keywords) === JSON.stringify(record.keywords));
    } catch (e) {
      assert(i, "Legacy compat", false, e.message);
    }
  }

  // ── Test E: Each store produces unique ciphertext ──────────
  if (i % 8 === 0 && record.patientName.length > 0) {
    try {
      const s1 = simulateStoreConsultation(record);
      const s2 = simulateStoreConsultation(record);
      assert(i, "Unique ciphertext per store",
        s1.payload.patientName !== s2.payload.patientName,
        "Same record stored with same ciphertext — IV reuse!");
    } catch (e) {
      assert(i, "Unique ciphertext", false, e.message);
    }
  }

  // ── Test F: SOAP object integrity ──────────────────────────
  if (i % 4 === 0) {
    try {
      const stored = simulateStoreConsultation(record);
      const read = simulateReadRecord(stored);
      const originalSoap = JSON.parse(record.soapNotes);
      const readSoap = JSON.parse(read.soapNotes);
      assert(i, "SOAP subjective intact",
        readSoap.subjective === originalSoap.subjective);
      assert(i, "SOAP assessment intact",
        readSoap.assessment === originalSoap.assessment);
    } catch (e) {
      assert(i, "SOAP integrity", false, e.message);
    }
  }

  // ── Test G: Prescription array integrity ───────────────────
  if (i % 4 === 0) {
    try {
      const stored = simulateStoreConsultation(record);
      const read = simulateReadRecord(stored);
      const origRx = JSON.parse(record.prescriptions);
      const readRx = JSON.parse(read.prescriptions);
      assert(i, "Rx count matches", readRx.length === origRx.length,
        `Expected ${origRx.length}, got ${readRx.length}`);
      if (origRx.length > 0) {
        assert(i, "First Rx drug matches",
          readRx[0].drug === origRx[0].drug);
      }
    } catch (e) {
      assert(i, "Rx integrity", false, e.message);
    }
  }
}

const elapsed = Date.now() - start;
const total = passed + failed;

// ── Summary ──────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));
console.log(`\x1b[1m🔐 Qdrant Encryption Integration Results\x1b[0m`);
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
  console.log("   ✅ Encrypt-before-store (all sensitive fields)");
  console.log("   ✅ Decrypt-after-read (all sensitive fields)");
  console.log("   ✅ Date stays plaintext (for sorting)");
  console.log("   ✅ Legacy unencrypted record compatibility");
  console.log("   ✅ Unique ciphertext per store (unique IVs)");
  console.log("   ✅ SOAP object deep integrity");
  console.log("   ✅ Prescription array deep integrity");
  console.log("\n   → Ready to proceed to Step 3: Session Hardening\n");
} else {
  console.log(`\n\x1b[31m⛔ ${failed} FAILURES — DO NOT PROCEED\x1b[0m\n`);
  process.exit(1);
}
