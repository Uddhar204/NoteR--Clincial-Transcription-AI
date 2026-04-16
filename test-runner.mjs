/**
 * notER Backend Test Suite — 16 iterations (2^4)
 * Run: node test-runner.mjs
 */

import OpenAI from 'openai';

const BASE = 'http://localhost:3000';
const PASS = '\x1b[32m✅ PASS\x1b[0m';
const FAIL = '\x1b[31m❌ FAIL\x1b[0m';
const WARN = '\x1b[33m⚠️  WARN\x1b[0m';

let passed = 0, failed = 0;

function log(n, label, status, detail = '') {
  const badge = status === 'pass' ? PASS : status === 'warn' ? WARN : FAIL;
  console.log(`[T${String(n).padStart(2,'0')}] ${badge} ${label}${detail ? ' — ' + detail : ''}`);
  if (status === 'pass') passed++; else if (status === 'fail') failed++;
}

async function get(path) {
  return fetch(BASE + path).then(r => ({ ok: r.ok, status: r.status, body: r.json() }));
}

async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status, body: await r.json() };
}

// ── TEST 1: App is running ──────────────────────────────────────
try {
  const r = await fetch(BASE + '/');
  log(1, 'App is reachable at localhost:3000', r.ok ? 'pass' : 'fail', `HTTP ${r.status}`);
} catch { log(1, 'App is reachable at localhost:3000', 'fail', 'Connection refused'); }

// ── TEST 2: generate-notes with no body ────────────────────────
try {
  const r = await post('/api/generate-notes', {});
  log(2, 'generate-notes rejects empty body', r.status === 400 ? 'pass' : 'fail', `Got ${r.status}`);
} catch(e) { log(2, 'generate-notes rejects empty body', 'fail', e.message); }

// ── TEST 3: generate-notes with valid short transcript ──────────
try {
  const r = await post('/api/generate-notes', { transcript: 'Doctor: Hello. Patient: I have a headache.' });
  const hasSOAP = r.body?.soap?.subjective !== undefined;
  log(3, 'generate-notes returns SOAP for short transcript', hasSOAP ? 'pass' : 'fail', `Status ${r.status}, hasSOAP=${hasSOAP}`);
  if (hasSOAP) console.log('     Summary:', r.body.summary);
} catch(e) { log(3, 'generate-notes valid short transcript', 'fail', e.message); }

// ── TEST 4: generate-notes with full cardiology transcript ──────
try {
  const transcript = `Doctor: Good morning. How are you feeling today?
Patient: Doctor, I have been having chest pain for about 2 weeks now. It comes when I climb stairs.
Doctor: Is the pain pressure-like or sharp?
Patient: It feels like pressure. Sometimes it goes to my left arm.
Doctor: Any breathlessness?
Patient: Yes, when I climb stairs.
Doctor: You have hypertension. I am prescribing Aspirin 150mg once daily after lunch and Atorvastatin 40mg at bedtime.`;
  const r = await post('/api/generate-notes', { transcript });
  const hasRx = Array.isArray(r.body?.prescriptions) && r.body.prescriptions.length > 0;
  log(4, 'generate-notes extracts prescriptions from cardiology case', hasRx ? 'pass' : 'fail', `Rx count: ${r.body?.prescriptions?.length}`);
  if (hasRx) console.log('     First Rx:', JSON.stringify(r.body.prescriptions[0]));
} catch(e) { log(4, 'generate-notes cardiology transcript', 'fail', e.message); }

// ── TEST 5: SOAP subjective not empty ──────────────────────────
try {
  const r = await post('/api/generate-notes', { transcript: 'Patient: I have knee pain. Doctor: Take rest.' });
  const subj = r.body?.soap?.subjective;
  log(5, 'SOAP subjective is non-empty string', (typeof subj === 'string' && subj.length > 10) ? 'pass' : 'fail', `Got: "${String(subj).slice(0,60)}..."`);
} catch(e) { log(5, 'SOAP subjective non-empty', 'fail', e.message); }

// ── TEST 6: SOAP plan is non-empty ────────────────────────────
try {
  const r = await post('/api/generate-notes', { transcript: 'Doctor: Take Metformin 500mg twice daily with meals. Follow low-sugar diet.' });
  const plan = r.body?.soap?.plan;
  log(6, 'SOAP plan is non-empty string', (typeof plan === 'string' && plan.length > 5) ? 'pass' : 'fail', `Got: "${String(plan).slice(0,60)}..."`);
} catch(e) { log(6, 'SOAP plan non-empty', 'fail', e.message); }

// ── TEST 7: prescriptions is always an array ──────────────────
try {
  const r = await post('/api/generate-notes', { transcript: 'Doctor: Rest for a week. No medicines needed.' });
  const isArr = Array.isArray(r.body?.prescriptions);
  log(7, 'prescriptions field is always an array', isArr ? 'pass' : 'fail', `Type: ${typeof r.body?.prescriptions}`);
} catch(e) { log(7, 'prescriptions always array', 'fail', e.message); }

// ── TEST 8: summary field is present ──────────────────────────
try {
  const r = await post('/api/generate-notes', { transcript: 'Patient: Fever for 3 days. Doctor: Paracetamol 500mg.' });
  const hasSummary = typeof r.body?.summary === 'string' && r.body.summary.length > 5;
  log(8, 'summary field is present and non-empty', hasSummary ? 'pass' : 'fail', `"${String(r.body?.summary).slice(0,80)}"`);
} catch(e) { log(8, 'summary field present', 'fail', e.message); }

// ── TEST 9: Vapi webhook — status-update event ────────────────
try {
  const r = await post('/api/vapi/webhook', { message: { type: 'status-update', status: 'in-progress' } });
  log(9, 'Vapi webhook handles status-update', r.body?.success ? 'pass' : 'fail', JSON.stringify(r.body));
} catch(e) { log(9, 'Vapi webhook status-update', 'fail', e.message); }

// ── TEST 10: Vapi webhook — transcript event ──────────────────
try {
  const r = await post('/api/vapi/webhook', { message: { type: 'transcript', role: 'user', transcript: 'I have chest pain.' } });
  log(10, 'Vapi webhook handles transcript event', r.body?.success ? 'pass' : 'fail', JSON.stringify(r.body));
} catch(e) { log(10, 'Vapi webhook transcript event', 'fail', e.message); }

// ── TEST 11: Vapi webhook — missing message body ──────────────
try {
  const r = await post('/api/vapi/webhook', {});
  log(11, 'Vapi webhook rejects missing message', r.status === 400 ? 'pass' : 'fail', `Status: ${r.status}`);
} catch(e) { log(11, 'Vapi webhook missing message', 'fail', e.message); }

// ── TEST 12: Vapi webhook — end-of-call-report ───────────────
try {
  const r = await post('/api/vapi/webhook', { message: { type: 'end-of-call-report', summary: 'Patient had chest pain.', transcript: 'Doctor: Hello. Patient: Chest pain.' } });
  log(12, 'Vapi webhook handles end-of-call-report', r.body?.success ? 'pass' : 'fail', JSON.stringify(r.body));
} catch(e) { log(12, 'Vapi webhook end-of-call-report', 'fail', e.message); }

// ── TEST 13: Memory API — GET with no query ───────────────────
try {
  const r = await get('/api/memory?limit=3');
  log(13, 'Memory GET rejects missing q param', r.status === 400 ? 'pass' : 'fail', `Status: ${r.status}`);
} catch(e) { log(13, 'Memory GET no query param', 'fail', e.message); }

// ── TEST 14: Memory API — GET with query ─────────────────────
try {
  const r = await get('/api/memory?q=chest+pain&limit=3');
  const hasResults = r.body !== undefined;
  log(14, 'Memory GET with query returns response', hasResults ? 'pass' : 'fail', `Body: ${JSON.stringify(await r.body).slice(0,80)}`);
} catch(e) { log(14, 'Memory GET with query', 'fail', e.message); }

// ── TEST 15: Direct KodeKloud API connection ─────────────────
try {
  const client = new OpenAI({ apiKey: 'sk-oKpQBTQFcJDZ5YTAnZ0Y0Q', baseURL: 'https://api.ai.kodekloud.com/v1' });
  const r = await client.chat.completions.create({
    model: 'google/gemini-3.1-pro-preview',
    messages: [{ role: 'user', content: 'Return the single word: CONNECTED' }],
    max_tokens: 100,
  });
  const content = r.choices[0]?.message?.content;
  log(15, 'KodeKloud API is reachable and responds', r.choices.length > 0 ? 'pass' : 'fail', `finish_reason: ${r.choices[0]?.finish_reason}, content: ${content?.slice(0,50)}`);
} catch(e) { log(15, 'KodeKloud API connection', 'fail', e.message); }

// ── TEST 16: generate-notes returns valid JSON structure (full validation) ─
try {
  const r = await post('/api/generate-notes', {
    transcript: 'Doctor: BP is 160/100. Patient is a known diabetic. Prescribe Metoprolol 25mg once daily morning and Amlodipine 5mg once daily.'
  });
  const b = r.body;
  const valid = (
    typeof b?.soap?.subjective === 'string' &&
    typeof b?.soap?.objective === 'string' &&
    typeof b?.soap?.assessment === 'string' &&
    typeof b?.soap?.plan === 'string' &&
    Array.isArray(b?.prescriptions) &&
    typeof b?.summary === 'string'
  );
  log(16, 'Full report structure validation (all 6 fields correct types)', valid ? 'pass' : 'fail',
    valid ? 'All fields present' : `Missing fields in: ${JSON.stringify(Object.keys(b || {}))}`);
  if (valid) {
    console.log('     Prescriptions found:', b.prescriptions.length);
    b.prescriptions.forEach((rx, i) => console.log(`       ${i+1}. ${rx.drug} ${rx.dosage} — ${rx.frequency}`));
  }
} catch(e) { log(16, 'Full report structure validation', 'fail', e.message); }

// ── Final summary ─────────────────────────────────────────────
console.log('\n' + '─'.repeat(55));
console.log(`\x1b[1mResult: ${passed} passed / ${failed} failed / 16 total\x1b[0m`);
console.log('─'.repeat(55));
