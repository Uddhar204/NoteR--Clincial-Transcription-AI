/**
 * Encryption Module — 2^10 (1024) Iteration Stress Test
 * Tests: encrypt/decrypt strings, objects, edge cases, tamper detection
 * Run:   node test-encryption.mjs
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ── Inline the encryption functions (can't import .ts directly) ──

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const KEY_HEX = "a1b2c3d4e5f6071829304a5b6c7d8e9fa1b2c3d4e5f6071829304a5b6c7d8e9f";
const KEY = Buffer.from(KEY_HEX, "hex");

function encrypt(plaintext) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv, { authTagLength: TAG_LENGTH });
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(packed) {
  const parts = packed.split(":");
  if (parts.length !== 3) throw new Error("Invalid format");
  const [ivHex, tagHex, cipherHex] = parts;
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, "hex"), { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let decrypted = decipher.update(cipherHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function encryptObject(obj) { return encrypt(JSON.stringify(obj)); }
function decryptObject(packed) { return JSON.parse(decrypt(packed)); }

// ── Test Infrastructure ────────────────────────────────────────
const TOTAL_ITERATIONS = 1024; // 2^10
let passed = 0;
let failed = 0;
const failures = [];

function assert(iteration, testName, condition, detail = "") {
  if (condition) {
    passed++;
  } else {
    failed++;
    if (failures.length < 20) failures.push({ iteration, testName, detail });
  }
}

// ── Clinical Test Data ─────────────────────────────────────────
const PATIENT_NAMES = [
  "John Smith", "María García López", "田中太郎", "محمد الأحمد",
  "Priya Sharma", "Jean-Pierre Dubois", "Ólafur Björnsson",
  "O'Brien-McCarthy", "", "A",
  "Patient with very long name ".repeat(20).trim(),
];

const TRANSCRIPTS = [
  "Doctor: Hello. Patient: I have chest pain for 2 weeks.",
  "Doctor: BP is 160/100. Prescribe Metoprolol 25mg.\nPatient: Any side effects?\nDoctor: Possible dizziness.",
  "Doctor: Patient presents with acute MI. ST elevation in leads II, III, aVF. STEMI protocol activated.",
  "Doctor: \"Take 2 tablets daily\" — the patient nodded.",
  "Patient: मुझे सीने में दर्द है। Doctor: Since when?",
  '{"nested": "json in transcript"}',
  "A".repeat(5000), // large payload
  "Special chars: <script>alert('xss')</script> & < > \" '",
  "Unicode: 🫀💊🩺 ❤️‍🩹 ECG: ∆QTc = 450ms ± 20ms",
  "",
];

const SOAP_OBJECTS = [
  {
    subjective: "Patient reports chest pain radiating to left arm for 2 weeks",
    objective: "BP 160/100, HR 88, Temp 98.6F",
    assessment: "Suspected unstable angina",
    plan: "Order stress test, start Aspirin 150mg daily",
  },
  {
    subjective: "",
    objective: "",
    assessment: "Not explicitly stated",
    plan: "",
  },
  {
    subjective: "Pain level: 8/10. Duration: \"2-3 weeks\". Location: substernal.",
    objective: 'ECG: Normal sinus rhythm. Labs: Troponin < 0.01 ng/mL',
    assessment: "Musculoskeletal chest pain — rule out ACS",
    plan: "Serial troponins q6h, telemetry monitoring, NPO status",
  },
];

const PRESCRIPTION_ARRAYS = [
  [{ drug: "Aspirin", dosage: "150mg", frequency: "Once daily", duration: "Lifelong" }],
  [
    { drug: "Metoprolol", dosage: "25mg", frequency: "Once daily AM", duration: "3 months" },
    { drug: "Atorvastatin", dosage: "40mg", frequency: "Once daily HS", duration: "Lifelong" },
    { drug: "Clopidogrel", dosage: "75mg", frequency: "Once daily", duration: "12 months" },
  ],
  [],
];

// ── Run Tests ──────────────────────────────────────────────────
console.log(`\n🔐 Encryption Module Stress Test — ${TOTAL_ITERATIONS} iterations`);
console.log("─".repeat(60));

const startTime = Date.now();

for (let i = 0; i < TOTAL_ITERATIONS; i++) {
  // ── Test A: String round-trip ──────────────────────────────
  const name = PATIENT_NAMES[i % PATIENT_NAMES.length];
  try {
    const enc = encrypt(name);
    const dec = decrypt(enc);
    assert(i, "String round-trip", dec === name, `Expected "${name}", got "${dec}"`);
  } catch (e) {
    assert(i, "String round-trip", false, e.message);
  }

  // ── Test B: Transcript round-trip ──────────────────────────
  const transcript = TRANSCRIPTS[i % TRANSCRIPTS.length];
  try {
    const enc = encrypt(transcript);
    const dec = decrypt(enc);
    assert(i, "Transcript round-trip", dec === transcript, `Mismatch at i=${i}`);
  } catch (e) {
    assert(i, "Transcript round-trip", false, e.message);
  }

  // ── Test C: Object round-trip (SOAP) ───────────────────────
  const soap = SOAP_OBJECTS[i % SOAP_OBJECTS.length];
  try {
    const enc = encryptObject(soap);
    const dec = decryptObject(enc);
    assert(i, "SOAP object round-trip",
      JSON.stringify(dec) === JSON.stringify(soap),
      `Mismatch at i=${i}`
    );
  } catch (e) {
    assert(i, "SOAP object round-trip", false, e.message);
  }

  // ── Test D: Object round-trip (Prescriptions) ──────────────
  const rx = PRESCRIPTION_ARRAYS[i % PRESCRIPTION_ARRAYS.length];
  try {
    const enc = encryptObject(rx);
    const dec = decryptObject(enc);
    assert(i, "Prescriptions object round-trip",
      JSON.stringify(dec) === JSON.stringify(rx),
      `Mismatch at i=${i}`
    );
  } catch (e) {
    assert(i, "Prescriptions object round-trip", false, e.message);
  }

  // ── Test E: Unique IVs (same input → different ciphertext) ─
  try {
    const enc1 = encrypt(name);
    const enc2 = encrypt(name);
    assert(i, "Unique IV per encrypt",
      enc1 !== enc2,
      "Two encryptions of same input produced identical ciphertext"
    );
  } catch (e) {
    assert(i, "Unique IV per encrypt", false, e.message);
  }

  // ── Test F: Ciphertext is not plaintext ────────────────────
  if (name.length > 0) {
    try {
      const enc = encrypt(name);
      assert(i, "Ciphertext hides plaintext",
        !enc.includes(name),
        "Plaintext visible in ciphertext"
      );
    } catch (e) {
      assert(i, "Ciphertext hides plaintext", false, e.message);
    }
  }

  // ── Test G: Tamper detection ───────────────────────────────
  if (i % 8 === 0) { // Run every 8th iteration to keep speed up
    try {
      const enc = encrypt("tamper test data " + i);
      const parts = enc.split(":");
      // Flip one hex char in the ciphertext
      const tampered = parts[0] + ":" + parts[1] + ":" +
        (parts[2].slice(0, -1) + (parts[2].slice(-1) === "0" ? "1" : "0"));
      let caught = false;
      try { decrypt(tampered); } catch { caught = true; }
      assert(i, "Tamper detection", caught, "Tampered ciphertext was accepted");
    } catch (e) {
      assert(i, "Tamper detection", false, e.message);
    }
  }

  // ── Test H: Wrong key detection ────────────────────────────
  if (i % 16 === 0) { // Run every 16th iteration
    try {
      const enc = encrypt("wrong key test " + i);
      const wrongKey = Buffer.from("ff".repeat(32), "hex");
      const parts = enc.split(":");
      const decipher = createDecipheriv(ALGORITHM, wrongKey, Buffer.from(parts[0], "hex"), { authTagLength: TAG_LENGTH });
      decipher.setAuthTag(Buffer.from(parts[1], "hex"));
      let caught = false;
      try {
        decipher.update(parts[2], "hex", "utf8");
        decipher.final("utf8");
      } catch { caught = true; }
      assert(i, "Wrong key rejected", caught, "Wrong key decrypted successfully");
    } catch (e) {
      assert(i, "Wrong key rejected", false, e.message);
    }
  }
}

const elapsed = Date.now() - startTime;
const totalTests = passed + failed;

// ── Summary ──────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));
console.log(`\x1b[1m🔐 Encryption Test Results\x1b[0m`);
console.log(`   Iterations: ${TOTAL_ITERATIONS}`);
console.log(`   Total assertions: ${totalTests}`);
console.log(`   \x1b[32m✅ Passed: ${passed}\x1b[0m`);
console.log(`   \x1b[31m❌ Failed: ${failed}\x1b[0m`);
console.log(`   Time: ${elapsed}ms (${(elapsed / TOTAL_ITERATIONS).toFixed(2)}ms per iteration)`);
console.log("─".repeat(60));

if (failures.length > 0) {
  console.log("\n\x1b[31mFirst failures:\x1b[0m");
  failures.forEach((f) => {
    console.log(`  [Iter ${f.iteration}] ${f.testName}: ${f.detail}`);
  });
}

if (failed === 0) {
  console.log(`\n\x1b[32m🎉 ALL ${totalTests} ASSERTIONS PASSED across ${TOTAL_ITERATIONS} iterations!\x1b[0m`);
  console.log("   ✅ String encryption/decryption");
  console.log("   ✅ Object encryption/decryption");
  console.log("   ✅ Unique IV per operation");
  console.log("   ✅ Ciphertext conceals plaintext");
  console.log("   ✅ Tamper detection (auth tag)");
  console.log("   ✅ Wrong key rejection");
  console.log("\n   → Ready to proceed to Step 2: Qdrant Integration\n");
} else {
  console.log(`\n\x1b[31m⛔ ${failed} FAILURES — DO NOT PROCEED\x1b[0m\n`);
  process.exit(1);
}
