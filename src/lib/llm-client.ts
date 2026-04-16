// LLM client using KodeKloud's OpenAI-compatible API
// Base URL: https://api.ai.kodekloud.com/v1
// Model: google/gemini-3.1-pro-preview

import OpenAI from "openai";

const MODEL = "google/gemini-3.1-pro-preview";
const BASE_URL = "https://api.ai.kodekloud.com/v1";

// ── Exported types ─────────────────────────────────────────────
export interface SOAPNotes {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface PrescriptionItem {
  drug: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface GeneratedReport {
  soap: SOAPNotes;
  prescriptions: PrescriptionItem[];
  summary: string;
}

// ── Build client (server-side only) ───────────────────────────
function getClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: BASE_URL,
  });
}

// ── Core chat call ─────────────────────────────────────────────
async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  const client = getClient(apiKey);

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 8192,
  });

  const choice = completion.choices[0];
  // The model may return content as message.content or in provider-specific fields
  const content =
    choice?.message?.content ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (choice?.message as any)?.provider_specific_fields?.reasoning_content ||
    null;

  if (!content) {
    throw new Error(`LLM returned an empty response (finish_reason: ${choice?.finish_reason})`);
  }
  return content;
}

// ── JSON parsing helper ────────────────────────────────────────
function parseJSONFromResponse(raw: string): GeneratedReport {
  // Strip markdown code fences if present (```json ... ```)
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as GeneratedReport;
  } catch {
    // Try extracting JSON object from mixed text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as GeneratedReport;
    }
    throw new Error("No valid JSON found in LLM response");
  }
}

// ── Generate clinical report ───────────────────────────────────
export async function generateClinicalReport(
  transcript: string,
  apiKey: string
): Promise<GeneratedReport> {
  const systemPrompt = `You are a medical documentation AI assistant specialising in cardiology. Your role is to structure clinical notes from doctor-patient conversations.

CRITICAL RULES:
1. ONLY extract information explicitly mentioned in the conversation
2. DO NOT hallucinate or assume any medical data
3. DO NOT generate prescriptions — ONLY extract what the doctor explicitly prescribes
4. If Assessment is not explicitly stated by the doctor, write "Not explicitly stated by physician"
5. Keep notes concise and cardiology-focused
6. Use standard medical abbreviations where appropriate

You must respond in EXACTLY this JSON format, nothing else:
{
  "soap": {
    "subjective": "Patient's reported symptoms, history, and complaints",
    "objective": "Physical examination findings, vitals, test results mentioned",
    "assessment": "Doctor's diagnosis/assessment ONLY if explicitly stated",
    "plan": "Treatment plan, follow-up instructions mentioned"
  },
  "prescriptions": [
    {
      "drug": "Drug name",
      "dosage": "Dosage",
      "frequency": "Frequency",
      "duration": "Duration"
    }
  ],
  "summary": "1-2 line summary of the consultation"
}

If no prescriptions were explicitly mentioned, return an empty array for prescriptions.
Always respond with valid JSON only. Do NOT wrap in markdown code fences.`;

  const userPrompt = `Here is the doctor-patient conversation transcript. Extract structured medical notes and any explicitly prescribed medications:

---
${transcript}
---

Generate the clinical report in JSON format.`;

  const raw = await callLLM(systemPrompt, userPrompt, apiKey);

  try {
    return parseJSONFromResponse(raw);
  } catch {
    console.error("Failed to parse LLM response as JSON:", raw.slice(0, 500));
    // Return structured fallback if parsing fails
    return {
      soap: {
        subjective: "Unable to parse — raw response available in logs",
        objective: "See raw transcript",
        assessment: "Not explicitly stated by physician",
        plan: "Review transcript manually",
      },
      prescriptions: [],
      summary: "Report generation encountered a parsing issue. Please review the transcript manually.",
    };
  }
}

// ── Translate text ─────────────────────────────────────────────
export async function translateText(
  text: string,
  apiKey: string
): Promise<string> {
  const systemPrompt = `You are a medical translator. Translate the following text to English.
Preserve all medical terminology accurately, especially cardiology-related terms.
If the text is already in English, return it as-is.
Only return the translated text, nothing else.`;

  return callLLM(systemPrompt, text, apiKey);
}
